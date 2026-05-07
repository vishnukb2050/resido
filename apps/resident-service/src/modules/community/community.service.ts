import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class CommunityService {
    constructor(private prisma: PrismaService) {}

    // ─── Notices ────────────────────────────────────────────────
    async getNotices() {
        return this.prisma.reader.notice.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async createNotice(data: any) {
        return this.prisma.client.notice.create({ data });
    }

    // ─── Polls ──────────────────────────────────────────────────
    async getPolls() {
        return this.prisma.reader.poll.findMany({
            include: { options: { include: { _count: { select: { votes: true } } } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async votePoll(memberId: string, optionId: string) {
        return this.prisma.client.pollVote.create({
            data: {
                member: { connect: { id: memberId } },
                option: { connect: { id: optionId } }
            } as any
        });
    }

    // ─── Complaints ─────────────────────────────────────────────
    async getComplaints(memberId?: string) {
        return this.prisma.reader.complaint.findMany({
            where: memberId ? { memberId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createComplaint(memberId: string, data: any) {
        return this.prisma.client.complaint.create({
            data: { ...data, memberId }
        });
    }

    // ─── Visitors / Gatepass ────────────────────────────────────
    async getVisitors(memberId?: string) {
        return this.prisma.reader.visitor.findMany({
            where: memberId ? { memberId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createGatepass(memberId: string, data: any) {
        const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        return this.prisma.client.visitor.create({
            data: { ...data, memberId, passCode }
        });
    }

    // ─── Events / Calendar ──────────────────────────────────────
    async getEvents(memberId: string) {
        return this.prisma.reader.event.findMany({
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

    async createEvent(memberId: string, data: any) {
        const { memberId: _, ...eventData } = data;
        return this.prisma.client.event.create({
            data: { 
                ...eventData, 
                createdBy: memberId 
            }
        });
    }

    // ─── Members ────────────────────────────────────────────────
    async getMembers() {
        return this.prisma.reader.member.findMany({
            select: { id: true, name: true, phone: true, role: true }
        });
    }

    // ─── Gallery ────────────────────────────────────────────────
    async getGallery() {
        return this.prisma.reader.gallery.findMany({ orderBy: { createdAt: 'desc' } });
    }
}
