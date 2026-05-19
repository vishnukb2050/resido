import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RemindersService {
    private readonly logger = new Logger(RemindersService.name);
    constructor(private prisma: PrismaService) {}

    async createReminder(tenantId: string, data: any) {
        const reminder = await this.prisma.client.reminder.create({
            data: {
                tenantId,
                title: data.title,
                message: data.message,
                category: data.category,
                targetType: data.targetType,
                targetRoles: data.targetRoles || [],
                targetUnits: data.targetUnits || [],
                targetMembers: data.targetMembers || [],
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
                status: 'PENDING',
            }
        });

        // If no schedule date is specified, dispatch it instantly!
        if (!reminder.scheduledAt) {
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

    async deleteReminder(tenantId: string, id: string) {
        return this.prisma.client.reminder.delete({
            where: { id }
        });
    }

    async dispatchReminder(tenantId: string, reminderId: string) {
        const reminder = await this.prisma.client.reminder.findUnique({
            where: { id: reminderId }
        });

        if (!reminder || reminder.status === 'SENT') {
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

            await this.prisma.client.reminder.update({
                where: { id: reminderId },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            });

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
