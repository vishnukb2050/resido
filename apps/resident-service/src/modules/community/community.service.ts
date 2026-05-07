import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class CommunityService {
    constructor(private tenantPrisma: TenantPrismaService) {}

    // ─── Notices ────────────────────────────────────────────────
    async getNotices(dbName: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async createNotice(dbName: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.notice.create({ data });
    }

    // ─── Polls ──────────────────────────────────────────────────
    async getPolls(dbName: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.poll.findMany({
            include: { options: { include: { _count: { select: { votes: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async votePoll(dbName: string, memberId: string, optionId: string) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.pollVote.create({
            data: { memberId, optionId }
        });
    }

    // ─── Complaints ─────────────────────────────────────────────
    async getComplaints(dbName: string, memberId?: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.complaint.findMany({
            where: memberId ? { memberId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createComplaint(dbName: string, memberId: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        return prisma.complaint.create({
            data: { ...data, memberId }
        });
    }

    // ─── Visitors / Gatepass ────────────────────────────────────
    async getVisitors(dbName: string, memberId?: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.visitor.findMany({
            where: memberId ? { memberId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createGatepass(dbName: string, memberId: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        return prisma.visitor.create({
            data: { ...data, memberId, passCode }
        });
    }

    // ─── Events / Calendar ──────────────────────────────────────
    async getEvents(dbName: string, memberId: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.event.findMany({
            where: {
                OR: [
                    { visibility: 'COMMUNITY' },
                    { createdBy: memberId },
                    { sharedWithIds: { has: memberId } }
                ]
            },
            orderBy: { startDate: 'asc' }
        });
    }

    async createEvent(dbName: string, memberId: string, data: any) {
        const prisma = this.tenantPrisma.getWriteClient(dbName);
        const { memberId: _, ...eventData } = data; // Remove memberId from data if present
        return prisma.event.create({
            data: { 
                ...eventData, 
                createdBy: memberId 
            }
        });
    }

    // ─── Members ────────────────────────────────────────────────
    async getMembers(dbName: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.member.findMany({
            select: { id: true, name: true, phone: true, role: true }
        });
    }

    // ─── Gallery ────────────────────────────────────────────────
    async getGallery(dbName: string) {
        const prisma = this.tenantPrisma.getReadClient(dbName);
        return prisma.gallery.findMany({ orderBy: { createdAt: 'desc' } });
    }
}
