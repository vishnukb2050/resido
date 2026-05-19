import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class CommunityFinanceService {
    constructor(private prisma: PrismaService) {}

    async getMaintenanceConfig(tenantId: string) {
        let config = await this.prisma.client.maintenanceConfig.findUnique({
            where: { tenantId }
        });
        if (!config) {
            config = await this.prisma.client.maintenanceConfig.create({
                data: { tenantId }
            });
        }
        return config;
    }

    async updateMaintenanceConfig(tenantId: string, data: any) {
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

    async addTransaction(tenantId: string, addedById: string, data: any) {
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
                addedById
            }
        });
    }

    async getTransactions(tenantId: string, query: any) {
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
                take: Number(limit)
            }),
            this.prisma.client.communityTransaction.count({ where })
        ]);

        return { items, total, page: Number(page), limit: Number(limit) };
    }

    async generateBills(tenantId: string, body: { month: number; year: number }) {
        const { month, year } = body;
        const config = await this.getMaintenanceConfig(tenantId);
        
        const units = await this.prisma.client.unit.findMany({
            where: { tenantId }
        });

        const billsData = [];
        const dueDate = new Date(year, month - 1, config.dueDateDay);

        for (const unit of units) {
            let baseAmount = 0;
            if (config.calculationType === 'FLAT_RATE') {
                baseAmount = config.flatRateAmount;
            } else if (config.calculationType === 'AREA_BASED') {
                baseAmount = config.ratePerSqFt * (unit.superBuiltUpArea || 0);
            }

            billsData.push({
                tenantId,
                unitId: unit.id,
                month: Number(month),
                year: Number(year),
                baseAmount,
                otherCharges: 0,
                penaltyAmount: 0,
                totalAmount: baseAmount,
                status: 'UNPAID' as const,
                dueDate
            });
        }

        await this.prisma.client.maintenanceBill.createMany({
            data: billsData,
            skipDuplicates: true
        });

        return { message: `Bills generated successfully for ${units.length} units.` };
    }

    async getMaintenanceStatus(tenantId: string, month: number, year: number) {
        const bills = await this.prisma.client.maintenanceBill.findMany({
            where: {
                tenantId,
                month: Number(month),
                year: Number(year)
            },
            include: {
                unit: {
                    include: {
                        block: true,
                        families: {
                            include: {
                                members: true
                            }
                        }
                    }
                }
            }
        });

        const paid = [];
        const pending = [];
        const due = [];

        for (const bill of bills) {
            const residentName = bill.unit.families[0]?.members[0]?.name || 'N/A';
            const residentPhone = bill.unit.families[0]?.members[0]?.phone || 'N/A';
            const residentEmail = bill.unit.families[0]?.members[0]?.email || 'N/A';
            const memberId = bill.unit.families[0]?.members[0]?.id || null;
            
            const mappedBill = {
                id: bill.id,
                unitId: bill.unitId,
                unitNumber: `${bill.unit.block?.name || ''}-${bill.unit.number}`,
                blockName: bill.unit.block?.name || 'N/A',
                totalAmount: bill.totalAmount,
                dueDate: bill.dueDate,
                paymentDate: bill.paymentDate,
                paymentMethod: bill.paymentMethod,
                receiptUrl: bill.receiptUrl,
                description: bill.description,
                rejectionReason: bill.rejectionReason,
                residentName,
                residentPhone,
                residentEmail,
                memberId,
                status: bill.status
            };

            if (bill.status === 'PAID') {
                paid.push(mappedBill);
            } else if (bill.status === 'PENDING_VERIFICATION') {
                pending.push(mappedBill);
            } else {
                due.push(mappedBill);
            }
        }

        return { paid, pending, due };
    }

    async getResidentBills(tenantId: string, memberId: string) {
        const member = await this.prisma.client.member.findUnique({
            where: { id: memberId },
            include: {
                family: {
                    include: {
                        unit: true
                    }
                }
            }
        });

        const unitId = member?.family?.unitId;
        if (!unitId) return [];

        return this.prisma.client.maintenanceBill.findMany({
            where: { tenantId, unitId },
            orderBy: { dueDate: 'desc' }
        });
    }

    async submitPaymentProof(billId: string, body: any) {
        const { receiptUrl, paymentMethod, description } = body;
        return this.prisma.client.maintenanceBill.update({
            where: { id: billId },
            data: {
                status: 'PENDING_VERIFICATION',
                receiptUrl,
                paymentMethod,
                description,
                rejectionReason: null
            }
        });
    }

    async verifyPayment(billId: string, tenantId: string, addedById: string, body: { action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
        const { action, rejectionReason } = body;

        const bill = await this.prisma.client.maintenanceBill.findUnique({
            where: { id: billId },
            include: {
                unit: true
            }
        });

        if (!bill) {
            throw new Error('Bill not found');
        }

        if (action === 'APPROVE') {
            const updated = await this.prisma.client.maintenanceBill.update({
                where: { id: billId },
                data: {
                    status: 'PAID',
                    paymentDate: new Date()
                }
            });

            await this.prisma.client.communityTransaction.create({
                data: {
                    tenantId,
                    amount: bill.totalAmount,
                    type: 'INCOME',
                    category: 'Maintenance',
                    date: new Date(),
                    description: `Maintenance fee paid by unit ${bill.unit.number} for ${bill.month}/${bill.year}`,
                    paymentMethod: bill.paymentMethod || 'UPI',
                    billUrl: bill.receiptUrl,
                    addedById,
                    maintenanceBillId: billId
                }
             });

             return updated;
        } else {
             return this.prisma.client.maintenanceBill.update({
                 where: { id: billId },
                 data: {
                     status: 'UNPAID',
                     rejectionReason
                 }
             });
        }
    }

    async getReports(tenantId: string, query: { period: 'day' | 'week' | 'month'; year: number }) {
        const period = query.period || 'month';
        const year = Number(query.year || new Date().getFullYear());
        
        const transactions = await this.prisma.client.communityTransaction.findMany({
            where: {
                tenantId,
                date: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31, 23, 59, 59)
                }
            }
        });

        const breakdown: { [key: string]: { income: number; expense: number } } = {};

        for (const t of transactions) {
            const date = new Date(t.date);
            let key = '';

            if (period === 'day') {
                key = date.toISOString().split('T')[0];
            } else if (period === 'week') {
                const oneJan = new Date(date.getFullYear(), 0, 1);
                const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
                const weekNum = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
                key = `W${weekNum} (${date.getFullYear()})`;
            } else {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                key = `${months[date.getMonth()]} ${date.getFullYear()}`;
            }

            if (!breakdown[key]) {
                breakdown[key] = { income: 0, expense: 0 };
            }

            if (t.type === 'INCOME') {
                breakdown[key].income += t.amount;
            } else {
                breakdown[key].expense += t.amount;
            }
        }

        const chartData = Object.keys(breakdown).map(key => ({
            label: key,
            income: breakdown[key].income,
            expense: breakdown[key].expense
        }));

        const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, c) => acc + c.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, c) => acc + c.amount, 0);

        const categoryBreakdown: { [category: string]: number } = {};
        for (const t of transactions) {
            if (t.type === 'EXPENSE') {
                categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
            }
        }

        const categories = Object.keys(categoryBreakdown).map(name => ({
            name,
            amount: categoryBreakdown[name]
        }));

        return {
            period,
            year,
            totalIncome,
            totalExpense,
            savings: totalIncome - totalExpense,
            chartData,
            categories
        };
    }
}
