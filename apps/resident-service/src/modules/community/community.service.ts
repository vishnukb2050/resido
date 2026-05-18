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
    async getComplaints(memberId?: string, staffId?: string) {
        return this.prisma.reader.complaint.findMany({
            where: {
                OR: [
                    memberId ? { memberId } : {},
                    staffId ? { assignedTo: staffId } : {}
                ].filter(o => Object.keys(o).length > 0)
            },
            include: {
                member: { select: { name: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async createComplaint(userId: string, data: any) {
        const member = await this.prisma.reader.member.findFirst({
            where: { 
                OR: [
                    { id: userId },
                    { userId: userId }
                ]
            }
        });

        if (!member) {
            throw new Error('Member not found for the given user ID in this community.');
        }

        const { memberId: _, ...complaintData } = data;

        return this.prisma.client.complaint.create({
            data: { 
                ...complaintData, 
                memberId: member.id 
            }
        });
    }

    async assignComplaint(id: string, staffId: string) {
        return this.prisma.client.complaint.update({
            where: { id },
            data: { 
                assignedTo: staffId,
                status: 'IN_PROGRESS'
            }
        });
    }

    async updateComplaintStatus(id: string, status: any) {
        return this.prisma.client.complaint.update({
            where: { id },
            data: { status }
        });
    }

    // ─── Visitors / Gatepass ────────────────────────────────────
    async getVisitors(memberId?: string) {
        return this.prisma.reader.visitor.findMany({
            where: memberId ? { memberId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createGatepass(userId: string, data: any) {
        // Find the member for this user (since frontend sends user.id as residentId/memberId)
        const member = await this.prisma.reader.member.findFirst({
            where: { 
                OR: [
                    { id: userId }, // If it's already a member ID
                    { userId: userId } // If it's a global user ID
                ]
            }
        });

        if (!member) {
            throw new Error('Member not found for the given user ID in this community.');
        }

        const passCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Filter and map fields to match the Visitor schema
        const visitorData = {
            tenantId: member.tenantId,
            name: data.visitorName || data.name,
            phone: data.phone || '0000000000', // Default if not provided since it's required in schema
            purpose: data.purpose,
            passCode,
            status: 'PENDING' as any,
            memberId: member.id, // Use the looked-up member.id
            vehicleNumber: data.vehicleNumber,
        };

        return this.prisma.client.visitor.create({
            data: visitorData
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
    async getGallery(folderId?: string) {
        return this.prisma.reader.gallery.findMany({
            where: folderId ? { folderId } : {},
            orderBy: { createdAt: 'desc' }
        });
    }

    async createGallery(data: any) {
        return this.prisma.client.gallery.create({
            data: {
                title: data.title,
                description: data.description,
                mediaUrls: data.mediaUrls,
                category: data.category,
                folderId: data.folderId,
                type: data.type || 'IMAGE',
                tenantId: '' // Will be overridden by tenant extension
            } as any
        });
    }

    async getGalleryFolders() {
        return this.prisma.reader.galleryFolder.findMany({
            include: { _count: { select: { items: true } } },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async createGalleryFolder(data: any) {
        return this.prisma.client.galleryFolder.create({
            data: {
                name: data.name,
                description: data.description,
                tenantId: '' // Will be overridden
            } as any
        });
    }

    // ─── Rules ──────────────────────────────────────────────────
    async getRules() {
        return this.prisma.reader.rule.findMany({ orderBy: { title: 'asc' } });
    }

    async createRule(data: any) {
        return this.prisma.client.rule.create({ data });
    }

    async deleteRule(id: string) {
        return this.prisma.client.rule.delete({ where: { id } });
    }
}
