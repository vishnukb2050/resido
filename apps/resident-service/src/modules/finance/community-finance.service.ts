import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Prisma } from '@resido/resident-client';
import { PrismaService } from '../prisma/tenant-prisma.service';
import Redis from 'ioredis';
import { pushNotificationMany } from '../../common/notify.helper';

@Injectable()
export class CommunityFinanceService {
    constructor(
        private prisma: PrismaService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) {}

    // ─── Member resolver ───────────────────────────────────────
    // Looks up a tenant Member by any of: resident-service Member.id,
    // auth-service User.id (stored in Member.userId), or phone.
    // Auto-links userId once a phone match succeeds.
    private async resolveMember(input: {
        candidateId?: string | null;
        authUserId?: string | null;
        phone?: string | null;
    }) {
        const { candidateId, authUserId, phone } = input;
        const ors: any[] = [];
        if (candidateId) ors.push({ id: candidateId }, { userId: candidateId });
        if (authUserId && authUserId !== candidateId) ors.push({ id: authUserId }, { userId: authUserId });
        if (phone) ors.push({ phone });
        if (!ors.length) return null;

        const member = await this.prisma.reader.member.findFirst({ where: { OR: ors } });
        if (!member) return null;
        if (authUserId && !member.userId) {
            try {
                await this.prisma.client.member.update({ where: { id: member.id }, data: { userId: authUserId } });
            } catch {}
        }
        return member;
    }

    private async requireAdmin(input: { authUserId?: string | null; phone?: string | null; role?: string | null }) {
        if (input.role === 'APARTMENT_ADMIN') return true;
        const m = await this.resolveMember({ authUserId: input.authUserId, phone: input.phone });
        if (m?.role === 'APARTMENT_ADMIN') return true;
        throw new ForbiddenException('Only community admins can perform this action.');
    }

    // ─── Maintenance Config ────────────────────────────────────
    async getMaintenanceConfig(tenantId: string) {
        let config = await this.prisma.reader.maintenanceConfig.findUnique({ where: { tenantId } });
        if (!config) {
            config = await this.prisma.client.maintenanceConfig.create({ data: { tenantId } });
        }
        return config;
    }

    async updateMaintenanceConfig(tenantId: string, actor: { authUserId?: string | null; authUserPhone?: string | null; role?: string | null }, data: any) {
        await this.requireAdmin({ authUserId: actor.authUserId, phone: actor.authUserPhone, role: actor.role });
        return this.prisma.client.maintenanceConfig.upsert({
            where: { tenantId },
            update: {
                billingCycle: data.billingCycle,
                calculationType: data.calculationType,
                flatRateAmount: Number(data.flatRateAmount || 0),
                ratePerSqFt: Number(data.ratePerSqFt || 0),
                dueDateDay: Number(data.dueDateDay || 10),
                penaltyType: data.penaltyType,
                penaltyAmount: Number(data.penaltyAmount || 0),
            },
            create: {
                tenantId,
                billingCycle: data.billingCycle,
                calculationType: data.calculationType,
                flatRateAmount: Number(data.flatRateAmount || 0),
                ratePerSqFt: Number(data.ratePerSqFt || 0),
                dueDateDay: Number(data.dueDateDay || 10),
                penaltyType: data.penaltyType,
                penaltyAmount: Number(data.penaltyAmount || 0),
            }
        });
    }

    // ─── Ledger Transactions ───────────────────────────────────
    async addTransaction(tenantId: string, actor: { authUserId?: string | null; authUserPhone?: string | null; role?: string | null }, data: any) {
        await this.requireAdmin({ authUserId: actor.authUserId, phone: actor.authUserPhone, role: actor.role });
        const admin = await this.resolveMember({ authUserId: actor.authUserId, phone: actor.authUserPhone });
        return this.prisma.client.communityTransaction.create({
            data: {
                tenantId,
                amount: Number(data.amount),
                type: data.type,
                category: data.category,
                date: new Date(data.date || Date.now()),
                description: data.description,
                paymentMethod: data.paymentMethod || 'CASH',
                billUrl: data.billUrl,
                addedById: admin?.id || actor.authUserId || 'system',
            }
        });
    }

    async getTransactions(tenantId: string, actor: { authUserId?: string | null; authUserPhone?: string | null; role?: string | null }, query: any) {
        await this.requireAdmin({ authUserId: actor.authUserId, phone: actor.authUserPhone, role: actor.role });
        const { type, category, page = 1, limit = 10 } = query;
        const skip = (Number(page) - 1) * Number(limit);
        const where: any = { tenantId };
        if (type) where.type = type;
        if (category) where.category = category;

        const [items, total] = await Promise.all([
            this.prisma.client.communityTransaction.findMany({
                where,
                orderBy: { date: 'desc' },
                skip,
                take: Number(limit),
            }),
            this.prisma.client.communityTransaction.count({ where }),
        ]);

        return { items, total, page: Number(page), limit: Number(limit) };
    }

    // ─── Maintenance Bills ─────────────────────────────────────
    async generateBills(tenantId: string, actor: { authUserId?: string | null; authUserPhone?: string | null; role?: string | null }, body: { month: number; year: number }) {
        await this.requireAdmin({ authUserId: actor.authUserId, phone: actor.authUserPhone, role: actor.role });
        const { month, year } = body;
        const config = await this.getMaintenanceConfig(tenantId);
        const dueDate = new Date(year, month - 1, config.dueDateDay);

        // Stream units in cursor-paged batches instead of loading every unit for
        // the tenant into memory at once. A large society (tens of thousands of
        // units) would otherwise build one giant in-memory array; batching keeps
        // peak memory flat and writes each batch as a single createMany.
        const BATCH = 1000;
        let cursorId: string | undefined;
        let totalUnits = 0;

        for (;;) {
            const units = await this.prisma.client.unit.findMany({
                where: { tenantId },
                orderBy: { id: 'asc' },
                take: BATCH,
                ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
                select: { id: true, superBuiltUpArea: true },
            });
            if (units.length === 0) break;

            const billsData = units.map((unit) => {
                let baseAmount = 0;
                if (config.calculationType === 'FLAT_RATE') {
                    baseAmount = config.flatRateAmount;
                } else if (config.calculationType === 'AREA_BASED') {
                    baseAmount = config.ratePerSqFt * (unit.superBuiltUpArea || 0);
                }
                return {
                    tenantId,
                    unitId: unit.id,
                    month: Number(month),
                    year: Number(year),
                    baseAmount,
                    otherCharges: 0,
                    penaltyAmount: 0,
                    totalAmount: baseAmount,
                    status: 'UNPAID' as const,
                    dueDate,
                };
            });

            await this.prisma.client.maintenanceBill.createMany({ data: billsData, skipDuplicates: true });
            totalUnits += units.length;

            if (units.length < BATCH) break;
            cursorId = units[units.length - 1].id;
        }

        const result = { message: `Bills generated successfully for ${totalUnits} units.`, units: totalUnits };

        // Notify all active residents that a new maintenance bill has been issued (fire-and-forget).
        setImmediate(async () => {
            try {
                const members = await this.prisma.reader.member.findMany({
                    where: {
                        tenantId,
                        isActive: true,
                        role: { in: ['RESIDENT', 'MEMBER'] },
                    },
                    select: { userId: true },
                });
                const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
                await pushNotificationMany(userIds, {
                    title: '🏠 New Maintenance Bill',
                    body: `Your maintenance bill for ${body.month}/${body.year} has been generated. Please pay before the due date.`,
                    data: { type: 'PAYMENT', month: String(body.month), year: String(body.year) },
                });
            } catch (e: any) {
                console.warn('[generateBills] notification dispatch failed:', e?.message);
            }
        });

        return result;
    }

    async getMaintenanceStatus(tenantId: string, month: number, year: number) {
        const cacheKey = `maintenance:status:${tenantId}:${year}:${month}`;
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch { /* Redis miss is non-fatal */ }

        const bills = await this.prisma.client.maintenanceBill.findMany({
            where: { tenantId, month: Number(month), year: Number(year) },
            include: {
                unit: {
                    include: {
                        block: true,
                        families: { include: { members: true } },
                    },
                },
            },
        });

        const paid: any[] = [];
        const pending: any[] = [];
        const due: any[] = [];

        for (const bill of bills) {
            // Flatten ALL members across ALL families that occupy this unit.
            // Maintenance is unit-wise — every resident in the unit shares this bill.
            const allMembers = bill.unit.families.flatMap(f => f.members || []);
            const primary = allMembers[0];
            const residentName = primary?.name || 'N/A';
            const residentPhone = primary?.phone || 'N/A';
            const residentEmail = primary?.email || 'N/A';
            const memberId = primary?.id || null;

            const mappedBill = {
                id: bill.id,
                unitId: bill.unitId,
                unitNumber: `${bill.unit.block?.name || ''}${bill.unit.block?.name ? '-' : ''}${bill.unit.number}`,
                blockName: bill.unit.block?.name || 'N/A',
                month: bill.month,
                year: bill.year,
                totalAmount: bill.totalAmount,
                amountPaid: bill.amountPaid,
                dueDate: bill.dueDate,
                paymentDate: bill.paymentDate,
                paymentMethod: bill.paymentMethod,
                receiptUrl: bill.receiptUrl,
                description: bill.description,
                adminNote: bill.adminNote,
                rejectionReason: bill.rejectionReason,
                residentName,
                residentPhone,
                residentEmail,
                memberId,
                unitResidents: allMembers.map(m => ({ id: m.id, name: m.name, phone: m.phone, role: m.role })),
                status: bill.status,
            };

            if (bill.status === 'PAID') paid.push(mappedBill);
            else if (bill.status === 'PENDING_VERIFICATION') pending.push(mappedBill);
            else due.push(mappedBill);
        }

        const result = { paid, pending, due };

        // Cache for 30 seconds — short enough to reflect a payment within the minute,
        // long enough to absorb repeated admin reloads without hammering the DB.
        try {
            await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30);
        } catch { /* non-fatal */ }

        return result;
    }

    // Unit-wise resolution: any member belonging to a unit (via Family) sees the SAME
    // set of maintenance bills as every other member of that unit. Payments are unit-scoped,
    // not user-scoped. We also fall back to a unit that was directly bound to the member
    // (community admin can pre-assign a unit).
    private async resolveUnitForCaller(args: { authUserId?: string; phone?: string }) {
        const member = await this.resolveMember({ authUserId: args.authUserId, phone: args.phone });
        if (!member) return null;

        const memberRow = await this.prisma.reader.member.findUnique({
            where: { id: member.id },
            include: { family: { include: { unit: { include: { block: true } } } } },
        });

        const unit = memberRow?.family?.unit;
        if (!unit) return { member, unit: null, unitId: null, unitLabel: null };

        const unitLabel = `${unit.block?.name || ''}${unit.block?.name ? '-' : ''}${unit.number}`;
        return { member, unit, unitId: unit.id, unitLabel };
    }

    async getResidentBills(args: { tenantId: string; authUserId?: string; authUserPhone?: string }) {
        const { tenantId, authUserId, authUserPhone } = args;
        const ctx = await this.resolveUnitForCaller({ authUserId, phone: authUserPhone });
        if (!ctx || !ctx.unitId) {
            return { unit: null, unitLabel: null, bills: [] };
        }

        const bills = await this.prisma.reader.maintenanceBill.findMany({
            where: { tenantId, unitId: ctx.unitId },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        return {
            unit: ctx.unit,
            unitLabel: ctx.unitLabel,
            unitId: ctx.unitId,
            bills,
        };
    }

    async submitPaymentProof(
        billId: string,
        body: { receiptUrl?: string; paymentMethod?: string; description?: string; amountPaid?: number },
    ) {
        return this.prisma.client.maintenanceBill.update({
            where: { id: billId },
            data: {
                status: 'PENDING_VERIFICATION',
                receiptUrl: body.receiptUrl,
                paymentMethod: body.paymentMethod,
                description: body.description,
                amountPaid: typeof body.amountPaid === 'number' ? body.amountPaid : undefined,
                rejectionReason: null,
                adminNote: null,
            },
        });
    }

    async verifyPayment(
        billId: string,
        tenantId: string,
        args: { authUserId?: string; authUserPhone?: string; role?: string },
        body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string; adminNote?: string },
    ) {
        await this.requireAdmin({ authUserId: args.authUserId, phone: args.authUserPhone, role: args.role });
        const adminMember = await this.resolveMember({ authUserId: args.authUserId, phone: args.authUserPhone });
        const addedById = adminMember?.id || args.authUserId || 'system';

        const bill = await this.prisma.client.maintenanceBill.findUnique({
            where: { id: billId },
            include: { unit: true },
        });
        if (!bill) throw new NotFoundException('Bill not found');

        if (body.action === 'APPROVE') {
            const updated = await this.prisma.client.maintenanceBill.update({
                where: { id: billId },
                data: {
                    status: 'PAID',
                    paymentDate: new Date(),
                    adminNote: body.adminNote || null,
                    rejectionReason: null,
                },
            });

            const txAmount = bill.amountPaid ?? bill.totalAmount;
            await this.prisma.client.communityTransaction.create({
                data: {
                    tenantId,
                    amount: txAmount,
                    type: 'INCOME',
                    category: 'Maintenance',
                    date: new Date(),
                    description: `Maintenance fee paid by unit ${bill.unit.number} for ${bill.month}/${bill.year}${body.adminNote ? ` — ${body.adminNote}` : ''}`,
                    paymentMethod: bill.paymentMethod || 'UPI',
                    billUrl: bill.receiptUrl,
                    addedById,
                    maintenanceBillId: billId,
                },
            });

            return updated;
        }

        return this.prisma.client.maintenanceBill.update({
            where: { id: billId },
            data: {
                status: 'UNPAID',
                rejectionReason: body.rejectionReason || null,
                adminNote: body.adminNote || body.rejectionReason || null,
            },
        });
    }

    async getReports(tenantId: string, actor: { authUserId?: string | null; authUserPhone?: string | null; role?: string | null }, query: { period: 'day' | 'week' | 'month'; year: number }) {
        await this.requireAdmin({ authUserId: actor.authUserId, phone: actor.authUserPhone, role: actor.role });
        const period = query.period || 'month';
        const year = Number(query.year || new Date().getFullYear());

        // Aggregate entirely in the DB (SUM + GROUP BY) instead of streaming every
        // transaction row into the pod and summing in JS. This rides the
        // `[tenantId, type, date]` / `[tenantId, category, date]` indexes and stays
        // O(buckets) no matter how many transactions a community records — so a
        // high-volume year can never OOM the service. NOTE: raw queries bypass the
        // tenant-isolation Prisma extension, so `tenantId` is filtered explicitly.
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);

        // Period → SQL label/group expression. Computed in SQL so buckets are
        // formed without materializing rows. Labels preserve the prior format
        // (`YYYY-MM-DD`, `W{n} (YYYY)`, `Mon YYYY`).
        const labelExpr =
            period === 'day'
                ? Prisma.sql`to_char("date", 'YYYY-MM-DD')`
                : period === 'week'
                    ? Prisma.sql`'W' || ceil((extract(dow from "date") + extract(doy from "date")) / 7.0)::int || ' (' || extract(year from "date")::int || ')'`
                    : Prisma.sql`to_char("date", 'Mon YYYY')`;

        const chartRows = await this.prisma.reader.$queryRaw<
            Array<{ label: string; income: number; expense: number }>
        >(Prisma.sql`
            SELECT ${labelExpr} AS label,
                COALESCE(SUM("amount") FILTER (WHERE "type" = 'INCOME'), 0)::float AS income,
                COALESCE(SUM("amount") FILTER (WHERE "type" = 'EXPENSE'), 0)::float AS expense
            FROM "community_transactions"
            WHERE "tenantId" = ${tenantId}
              AND "date" >= ${start} AND "date" <= ${end}
            GROUP BY ${labelExpr}
            ORDER BY MIN("date") DESC
        `);

        const categoryRows = await this.prisma.reader.$queryRaw<
            Array<{ name: string; amount: number }>
        >(Prisma.sql`
            SELECT "category" AS name, COALESCE(SUM("amount"), 0)::float AS amount
            FROM "community_transactions"
            WHERE "tenantId" = ${tenantId} AND "type" = 'EXPENSE'
              AND "date" >= ${start} AND "date" <= ${end}
            GROUP BY "category"
            ORDER BY amount DESC
        `);

        const chartData = chartRows.map(r => ({
            label: r.label,
            income: Number(r.income),
            expense: Number(r.expense),
        }));
        // Totals are derived from the (small) bucket set, so they stay consistent
        // with the chart and need no extra scan.
        const totalIncome = chartData.reduce((a, c) => a + c.income, 0);
        const totalExpense = chartData.reduce((a, c) => a + c.expense, 0);
        const categories = categoryRows.map(r => ({ name: r.name, amount: Number(r.amount) }));

        return { period, year, totalIncome, totalExpense, savings: totalIncome - totalExpense, chartData, categories };
    }

    // ─── Payment Splits ────────────────────────────────────────
    // Admin creates a split → server resolves target units → one share row per unit.
    // Splits are intentionally NOT logged into CommunityTransaction so the
    // monthly maintenance "Collected" totals stay clean.
    async createSplit(
        tenantId: string,
        args: { authUserId?: string; authUserPhone?: string; role?: string },
        body: {
            purpose: string;
            description?: string;
            totalAmount: number;
            splitMode?: 'EQUAL' | 'CUSTOM';
            targetType: 'ALL' | 'BLOCKS' | 'UNITS';
            targetBlocks?: string[];
            targetUnits?: string[];
            customShares?: Record<string, number>; // unitId → amount (CUSTOM mode)
            dueDate?: string | null;
        },
    ) {
        await this.requireAdmin({ authUserId: args.authUserId, phone: args.authUserPhone, role: args.role });
        const admin = await this.resolveMember({ authUserId: args.authUserId, phone: args.authUserPhone });

        if (!body.purpose || !body.purpose.trim()) throw new BadRequestException('Purpose is required.');
        if (!body.totalAmount || body.totalAmount <= 0) throw new BadRequestException('Total amount must be positive.');

        // Resolve target units
        let units: { id: string }[] = [];
        if (body.targetType === 'ALL') {
            units = await this.prisma.reader.unit.findMany({ where: { tenantId }, select: { id: true } });
        } else if (body.targetType === 'BLOCKS') {
            if (!body.targetBlocks?.length) throw new BadRequestException('Select at least one block.');
            units = await this.prisma.reader.unit.findMany({
                where: { tenantId, blockId: { in: body.targetBlocks } },
                select: { id: true },
            });
        } else if (body.targetType === 'UNITS') {
            if (!body.targetUnits?.length) throw new BadRequestException('Select at least one unit.');
            units = await this.prisma.reader.unit.findMany({
                where: { tenantId, id: { in: body.targetUnits } },
                select: { id: true },
            });
        } else {
            throw new BadRequestException('Invalid targetType.');
        }

        if (!units.length) throw new BadRequestException('No matching units for this split.');

        const splitMode = body.splitMode || 'EQUAL';
        const equalShare = body.totalAmount / units.length;
        const shareData = units.map(u => ({
            tenantId,
            unitId: u.id,
            amount:
                splitMode === 'CUSTOM' && body.customShares && body.customShares[u.id] != null
                    ? Number(body.customShares[u.id])
                    : Number(equalShare.toFixed(2)),
        }));

        // Sanity check: in CUSTOM mode the sum must match totalAmount within ₹1
        if (splitMode === 'CUSTOM') {
            const sum = shareData.reduce((s, x) => s + x.amount, 0);
            if (Math.abs(sum - body.totalAmount) > 1) {
                throw new BadRequestException(
                    `Custom shares (₹${sum.toFixed(2)}) don't match the total amount (₹${body.totalAmount}).`,
                );
            }
        }

        return this.prisma.client.paymentSplit.create({
            data: {
                tenantId,
                purpose: body.purpose.trim(),
                description: body.description,
                totalAmount: body.totalAmount,
                splitMode,
                targetType: body.targetType,
                targetBlocks: body.targetBlocks || [],
                targetUnits: body.targetUnits || [],
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                createdById: admin?.id || null,
                shares: { create: shareData },
            },
            include: { shares: true },
        });
    }

    async listSplits(tenantId: string) {
        // Step 1: Fetch splits with flat shares
        const splits = await this.prisma.reader.paymentSplit.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                shares: true,
            },
            take: 500,
        });

        // Step 2: Fetch all units in the community exactly once
        const units = await this.prisma.reader.unit.findMany({
            where: { tenantId },
            include: {
                block: true,
                families: {
                    include: {
                        members: true,
                    },
                },
            },
        });
        const unitMap = new Map(units.map(u => [u.id, u]));

        return splits.map(s => {
            const sharesMapped = s.shares.map(sh => {
                const unit = unitMap.get(sh.unitId);
                if (!unit) {
                    return {
                        id: sh.id,
                        unitId: sh.unitId,
                        unitNumber: 'Unknown',
                        blockName: 'N/A',
                        amount: sh.amount,
                        amountPaid: sh.amountPaid,
                        status: sh.status,
                        paymentDate: sh.paymentDate,
                        paymentMethod: sh.paymentMethod,
                        receiptUrl: sh.receiptUrl,
                        description: sh.description,
                        adminNote: sh.adminNote,
                        rejectionReason: sh.rejectionReason,
                        residentName: 'N/A',
                        residentPhone: 'N/A',
                        unitResidents: [],
                    };
                }
                const allMembers = unit.families.flatMap(f => f.members || []);
                const primary = allMembers[0];
                return {
                    id: sh.id,
                    unitId: sh.unitId,
                    unitNumber: `${unit.block?.name || ''}${unit.block?.name ? '-' : ''}${unit.number}`,
                    blockName: unit.block?.name || 'N/A',
                    amount: sh.amount,
                    amountPaid: sh.amountPaid,
                    status: sh.status,
                    paymentDate: sh.paymentDate,
                    paymentMethod: sh.paymentMethod,
                    receiptUrl: sh.receiptUrl,
                    description: sh.description,
                    adminNote: sh.adminNote,
                    rejectionReason: sh.rejectionReason,
                    residentName: primary?.name || 'N/A',
                    residentPhone: primary?.phone || 'N/A',
                    unitResidents: allMembers.map(m => ({ id: m.id, name: m.name, phone: m.phone, role: m.role })),
                };
            });

            const paidCount = sharesMapped.filter(x => x.status === 'PAID').length;
            const pendingCount = sharesMapped.filter(x => x.status === 'PENDING_VERIFICATION').length;
            const collected = sharesMapped
                .filter(x => x.status === 'PAID')
                .reduce((a, c) => a + (c.amountPaid ?? c.amount), 0);

            return {
                id: s.id,
                purpose: s.purpose,
                description: s.description,
                totalAmount: s.totalAmount,
                splitMode: s.splitMode,
                targetType: s.targetType,
                targetBlocks: s.targetBlocks,
                targetUnits: s.targetUnits,
                dueDate: s.dueDate,
                status: s.status,
                createdAt: s.createdAt,
                totalShares: sharesMapped.length,
                paidCount,
                pendingCount,
                collected,
                shares: sharesMapped,
            };
        });
    }

    async deleteSplit(
        tenantId: string,
        id: string,
        args: { authUserId?: string; authUserPhone?: string; role?: string },
    ) {
        await this.requireAdmin({ authUserId: args.authUserId, phone: args.authUserPhone, role: args.role });
        const existing = await this.prisma.reader.paymentSplit.findFirst({ where: { id, tenantId } });
        if (!existing) throw new NotFoundException('Split not found.');
        await this.prisma.client.paymentSplit.delete({ where: { id } });
        return { success: true };
    }

    async getMySplitShares(args: { tenantId: string; authUserId?: string; authUserPhone?: string }) {
        const { tenantId, authUserId, authUserPhone } = args;
        const ctx = await this.resolveUnitForCaller({ authUserId, phone: authUserPhone });
        if (!ctx || !ctx.unitId) {
            return { unit: null, unitLabel: null, shares: [] };
        }

        const shares = await this.prisma.reader.paymentSplitShare.findMany({
            where: { tenantId, unitId: ctx.unitId },
            orderBy: { createdAt: 'desc' },
            include: { split: true },
        });

        const mapped = shares.map(sh => ({
            id: sh.id,
            splitId: sh.splitId,
            purpose: sh.split.purpose,
            splitDescription: sh.split.description,
            dueDate: sh.split.dueDate,
            splitTotalAmount: sh.split.totalAmount,
            unitId: sh.unitId,
            unitNumber: ctx.unitLabel,
            amount: sh.amount,
            amountPaid: sh.amountPaid,
            status: sh.status,
            paymentDate: sh.paymentDate,
            paymentMethod: sh.paymentMethod,
            receiptUrl: sh.receiptUrl,
            description: sh.description,
            adminNote: sh.adminNote,
            rejectionReason: sh.rejectionReason,
        }));

        return { unit: ctx.unit, unitLabel: ctx.unitLabel, unitId: ctx.unitId, shares: mapped };
    }

    async submitSplitProof(
        shareId: string,
        body: { receiptUrl?: string; paymentMethod?: string; description?: string; amountPaid?: number },
    ) {
        return this.prisma.client.paymentSplitShare.update({
            where: { id: shareId },
            data: {
                status: 'PENDING_VERIFICATION',
                receiptUrl: body.receiptUrl,
                paymentMethod: body.paymentMethod,
                description: body.description,
                amountPaid: typeof body.amountPaid === 'number' ? body.amountPaid : undefined,
                rejectionReason: null,
                adminNote: null,
            },
        });
    }

    async verifySplitShare(
        shareId: string,
        tenantId: string,
        args: { authUserId?: string; authUserPhone?: string; role?: string },
        body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string; adminNote?: string },
    ) {
        await this.requireAdmin({ authUserId: args.authUserId, phone: args.authUserPhone, role: args.role });

        const share = await this.prisma.client.paymentSplitShare.findUnique({ where: { id: shareId } });
        if (!share) throw new NotFoundException('Split share not found.');

        if (body.action === 'APPROVE') {
            return this.prisma.client.paymentSplitShare.update({
                where: { id: shareId },
                data: {
                    status: 'PAID',
                    paymentDate: new Date(),
                    adminNote: body.adminNote || null,
                    rejectionReason: null,
                },
            });
        }

        return this.prisma.client.paymentSplitShare.update({
            where: { id: shareId },
            data: {
                status: 'UNPAID',
                rejectionReason: body.rejectionReason || null,
                adminNote: body.adminNote || body.rejectionReason || null,
            },
        });
    }
}
