import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RemindersService {
    private readonly logger = new Logger(RemindersService.name);
    constructor(private prisma: PrismaService) {}

    /**
     * Resolve the calling member from any combination of:
     *   - Member.id / Member.userId (CUID)
     *   - Auth user id (from JWT, stored in Member.userId)
     *   - Phone (from JWT, unique per tenant)
     */
    private async resolveMember(input: {
        candidateId?: string | null;
        authUserId?: string | null;
        phone?: string | null;
    }) {
        const ors: any[] = [];
        if (input.candidateId) ors.push({ id: input.candidateId }, { userId: input.candidateId });
        if (input.authUserId && input.authUserId !== input.candidateId) {
            ors.push({ id: input.authUserId }, { userId: input.authUserId });
        }
        if (input.phone) ors.push({ phone: input.phone });
        if (!ors.length) return null;

        const m = await this.prisma.client.member.findFirst({ where: { OR: ors } });
        if (m && input.authUserId && !m.userId) {
            try {
                await this.prisma.client.member.update({
                    where: { id: m.id },
                    data: { userId: input.authUserId },
                });
            } catch {}
        }
        return m;
    }

    async createReminder(tenantId: string, data: any) {
        let calculatedSchedule: Date | null = null;
        
        if (data.scheduledAt) {
            calculatedSchedule = new Date(data.scheduledAt);
        } else if (data.recurrence === 'WEEKLY' && typeof data.recurrenceDetail === 'number') {
            const nextDate = new Date();
            const currentDay = nextDate.getDay();
            const targetDay = data.recurrenceDetail;
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
            nextDate.setDate(nextDate.getDate() + daysToAdd);
            nextDate.setHours(9, 0, 0, 0); // Default to 9 AM
            calculatedSchedule = nextDate;
        } else if (data.recurrence === 'MONTHLY' && typeof data.recurrenceDetail === 'number') {
            const nextDate = new Date();
            nextDate.setDate(data.recurrenceDetail);
            if (nextDate <= new Date()) {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            nextDate.setHours(9, 0, 0, 0); // Default to 9 AM
            calculatedSchedule = nextDate;
        }

        const reminder = await this.prisma.client.reminder.create({
            data: {
                tenantId,
                title: data.title,
                message: data.message,
                imageUrl: data.imageUrl || null,
                category: data.category,
                targetType: data.targetType,
                targetRoles: data.targetRoles || [],
                targetUnits: data.targetUnits || [],
                targetMembers: data.targetMembers || [],
                scheduledAt: calculatedSchedule,
                status: 'PENDING',
                recurrence: data.recurrence || 'ONCE',
                recurrenceDetail: data.recurrenceDetail || null,
            }
        });

        // If no schedule date is specified and it's once, dispatch it instantly!
        if (!reminder.scheduledAt && reminder.recurrence === 'ONCE') {
            await this.dispatchReminder(tenantId, reminder.id);
        }

        return reminder;
    }

    async getReminders(tenantId: string) {
        return this.prisma.client.reminder.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Returns reminders that target the calling member. Used by residents,
     * members, and staff to see what was assigned to them.
     */
    async getMyReminders(args: {
        tenantId: string;
        authUserId?: string;
        authUserPhone?: string;
    }) {
        const member = await this.resolveMember({
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });

        if (!member) {
            // Return only ALL-targeted reminders if we can't resolve identity.
            return this.prisma.client.reminder.findMany({
                where: { tenantId: args.tenantId, targetType: 'ALL' },
                orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
            });
        }

        // Resolve the member's unit (via Family.unitId) for SPECIFIC_UNITS matching.
        let unitId: string | null = null;
        if (member.familyId) {
            const family = await this.prisma.client.family.findUnique({
                where: { id: member.familyId },
                select: { unitId: true },
            });
            unitId = family?.unitId || null;
        }

        const orFilters: any[] = [
            { targetType: 'ALL' },
            { targetType: 'STAFF_ROLE', targetRoles: { has: member.role } },
            { targetType: 'SPECIFIC_MEMBERS', targetMembers: { has: member.id } },
        ];
        if (unitId) {
            orFilters.push({ targetType: 'SPECIFIC_UNITS', targetUnits: { has: unitId } });
        }

        return this.prisma.client.reminder.findMany({
            where: { tenantId: args.tenantId, OR: orFilters },
            orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async updateReminder(tenantId: string, id: string, data: any) {
        const existing = await this.prisma.client.reminder.findFirst({ where: { id, tenantId } });
        if (!existing) return null;

        // Recompute scheduledAt if recurrence / detail changed or a new scheduledAt was provided
        let calculatedSchedule: Date | null | undefined = undefined;
        if (data.scheduledAt !== undefined) {
            calculatedSchedule = data.scheduledAt ? new Date(data.scheduledAt) : null;
        } else if (data.recurrence && data.recurrence !== existing.recurrence) {
            const recurrenceDetail = data.recurrenceDetail ?? existing.recurrenceDetail;
            if (data.recurrence === 'WEEKLY' && typeof recurrenceDetail === 'number') {
                const nextDate = new Date();
                const targetDay = recurrenceDetail;
                let daysToAdd = targetDay - nextDate.getDay();
                if (daysToAdd <= 0) daysToAdd += 7;
                nextDate.setDate(nextDate.getDate() + daysToAdd);
                nextDate.setHours(9, 0, 0, 0);
                calculatedSchedule = nextDate;
            } else if (data.recurrence === 'MONTHLY' && typeof recurrenceDetail === 'number') {
                const nextDate = new Date();
                nextDate.setDate(recurrenceDetail);
                if (nextDate <= new Date()) nextDate.setMonth(nextDate.getMonth() + 1);
                nextDate.setHours(9, 0, 0, 0);
                calculatedSchedule = nextDate;
            } else if (data.recurrence === 'ONCE') {
                calculatedSchedule = null;
            }
        }

        const payload: any = {};
        if (typeof data.title === 'string') payload.title = data.title;
        if (typeof data.message === 'string') payload.message = data.message;
        if (data.imageUrl === null || typeof data.imageUrl === 'string') payload.imageUrl = data.imageUrl;
        if (typeof data.category === 'string') payload.category = data.category;
        if (typeof data.targetType === 'string') payload.targetType = data.targetType;
        if (Array.isArray(data.targetRoles)) payload.targetRoles = data.targetRoles;
        if (Array.isArray(data.targetUnits)) payload.targetUnits = data.targetUnits;
        if (Array.isArray(data.targetMembers)) payload.targetMembers = data.targetMembers;
        if (typeof data.recurrence === 'string') payload.recurrence = data.recurrence;
        if (data.recurrenceDetail === null || typeof data.recurrenceDetail === 'number') {
            payload.recurrenceDetail = data.recurrenceDetail;
        }
        if (calculatedSchedule !== undefined) {
            payload.scheduledAt = calculatedSchedule;
            // Re-arm pending state if the schedule moves into the future
            if (calculatedSchedule && calculatedSchedule > new Date()) {
                payload.status = 'PENDING';
            }
        }

        return this.prisma.client.reminder.update({
            where: { id },
            data: payload,
        });
    }

    async deleteReminder(tenantId: string, id: string) {
        return this.prisma.client.reminder.delete({
            where: { id }
        });
    }

    async dispatchReminder(tenantId: string, reminderId: string) {
        const reminder = await this.prisma.client.reminder.findUnique({
            where: { id: reminderId }
        });

        if (!reminder || (reminder.status === 'SENT' && reminder.recurrence === 'ONCE')) {
            return;
        }

        try {
            let targetMemberIds: string[] = [];

            if (reminder.targetType === 'ALL') {
                const members = await this.prisma.client.member.findMany({
                    where: { tenantId, isActive: true },
                    select: { id: true }
                });
                targetMemberIds = members.map(m => m.id);

            } else if (reminder.targetType === 'SPECIFIC_UNITS') {
                const families = await this.prisma.client.family.findMany({
                    where: {
                        tenantId,
                        unitId: { in: reminder.targetUnits }
                    },
                    include: {
                        members: {
                            select: { id: true }
                        }
                    }
                });
                targetMemberIds = families.flatMap(f => f.members.map(m => m.id));

            } else if (reminder.targetType === 'STAFF_ROLE') {
                const roles = reminder.targetRoles as any[];
                const members = await this.prisma.client.member.findMany({
                    where: {
                        tenantId,
                        isActive: true,
                        role: { in: roles }
                    },
                    select: { id: true }
                });
                targetMemberIds = members.map(m => m.id);

            } else if (reminder.targetType === 'SPECIFIC_MEMBERS') {
                targetMemberIds = reminder.targetMembers;
            }

            // De-duplicate IDs
            targetMemberIds = Array.from(new Set(targetMemberIds));

            if (targetMemberIds.length > 0) {
                // Chunk size of 100 to support small, medium, and massive townships gracefully
                const chunkSize = 100;
                for (let i = 0; i < targetMemberIds.length; i += chunkSize) {
                    const chunk = targetMemberIds.slice(i, i + chunkSize);
                    
                    const notificationsData = chunk.map(memberId => ({
                        tenantId,
                        memberId,
                        type: 'PAYMENT_REMINDER' as const, // Map to PAYMENT_REMINDER for uniform push alerting
                        title: reminder.title,
                        body: reminder.message,
                        isRead: false
                    }));

                    await this.prisma.client.notification.createMany({
                        data: notificationsData
                    });
                }
            }

            // Calculate next schedule for weekly / monthly recurrence
            if (reminder.recurrence === 'WEEKLY' && reminder.scheduledAt) {
                const nextSchedule = new Date(reminder.scheduledAt);
                nextSchedule.setDate(nextSchedule.getDate() + 7);
                
                await this.prisma.client.reminder.update({
                    where: { id: reminderId },
                    data: {
                        scheduledAt: nextSchedule,
                        sentAt: new Date()
                    }
                });
            } else if (reminder.recurrence === 'MONTHLY' && reminder.scheduledAt) {
                const nextSchedule = new Date(reminder.scheduledAt);
                nextSchedule.setMonth(nextSchedule.getMonth() + 1);
                
                await this.prisma.client.reminder.update({
                    where: { id: reminderId },
                    data: {
                        scheduledAt: nextSchedule,
                        sentAt: new Date()
                    }
                });
            } else {
                await this.prisma.client.reminder.update({
                    where: { id: reminderId },
                    data: {
                        status: 'SENT',
                        sentAt: new Date()
                    }
                });
            }

            this.logger.log(`Reminder ${reminderId} dispatched to ${targetMemberIds.length} members successfully.`);
        } catch (e) {
            this.logger.error(`Failed to dispatch reminder ${reminderId}`, e);
            await this.prisma.client.reminder.update({
                where: { id: reminderId },
                data: { status: 'FAILED' }
            });
        }
    }

    // Cron checking every minute to dispatch pending scheduled items
    @Cron(CronExpression.EVERY_MINUTE)
    async checkAndDispatchScheduled() {
        this.logger.log('Running scheduled reminders dispatch checker...');
        try {
            const pendingReminders = await this.prisma.client.reminder.findMany({
                where: {
                    status: 'PENDING',
                    scheduledAt: {
                        lte: new Date()
                    }
                }
            });

            if (pendingReminders.length > 0) {
                this.logger.log(`Found ${pendingReminders.length} pending scheduled reminders to dispatch.`);
                for (const r of pendingReminders) {
                    await this.dispatchReminder(r.tenantId, r.id);
                }
            }
        } catch (e) {
            this.logger.error('Error during scheduled reminders run', e);
        }
    }
}
