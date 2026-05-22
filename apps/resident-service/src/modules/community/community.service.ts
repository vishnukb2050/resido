import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
        console.log(`[getComplaints] Fetching complaints for memberId: ${memberId}, staffId: ${staffId}`);
        const tenantId = PrismaService.als.getStore()?.tenantId;
        console.log(`[getComplaints] active tenantId context: ${tenantId}`);

        let staffMemberId = staffId;
        if (staffId) {
            // Find the member record if staffId is actually a global Auth userId or a direct CUID
            const staffMember = await this.prisma.reader.member.findFirst({
                where: {
                    OR: [
                        { id: staffId },
                        { userId: staffId }
                    ]
                }
            });
            if (staffMember) {
                staffMemberId = staffMember.id;
            }
        }

        let actualMemberId = memberId;
        if (memberId) {
            // Find the member record if memberId is actually a global Auth userId or a direct CUID
            const residentMember = await this.prisma.reader.member.findFirst({
                where: {
                    OR: [
                        { id: memberId },
                        { userId: memberId }
                    ]
                }
            });
            if (residentMember) {
                actualMemberId = residentMember.id;
            }
        }

        // Build a robust where clause
        const whereClause: any = {};
        if (actualMemberId || staffMemberId) {
            whereClause.OR = [
                actualMemberId ? { memberId: actualMemberId } : null,
                staffMemberId ? { assignedTo: staffMemberId } : null
            ].filter(Boolean);
        }

        console.log(`[getComplaints] Querying complaints with whereClause:`, JSON.stringify(whereClause));

        const complaints = await this.prisma.reader.complaint.findMany({
            where: whereClause,
            include: {
                member: { select: { name: true, phone: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`[getComplaints] Found ${complaints.length} complaints.`);

        const staffIds = complaints.map((c: any) => c.assignedTo).filter(Boolean);
        const staffMembers = await this.prisma.reader.member.findMany({
            where: { id: { in: staffIds } },
            select: { id: true, name: true, role: true }
        });

        const staffMap = new Map(staffMembers.map((s: any) => [s.id, s]));

        return complaints.map((c: any) => ({
            ...c,
            assignedTo: c.assignedTo ? staffMap.get(c.assignedTo) || null : null
        }));
    }

    async createComplaint(userId: string, data: any) {
        console.log(`[createComplaint] userId/memberId parameter: ${userId}, data:`, data);
        const tenantId = PrismaService.als.getStore()?.tenantId || data.tenantId || 'resido-core';
        console.log(`[createComplaint] active tenantId context: ${tenantId}`);

        // Robust lookup checking both ID and global Auth userId
        let member = await this.prisma.reader.member.findFirst({
            where: { 
                OR: [
                    { id: userId },
                    { userId: userId }
                ]
            }
        });

        // Fallback: If no member record exists for this user, create one on the fly
        if (!member) {
            console.log(`Member not found for user ${userId}. Creating on the fly...`);
            member = await this.prisma.client.member.create({
                data: {
                    userId: userId,
                    tenantId: tenantId,
                    name: 'Default Member',
                    phone: '0000000000',
                    role: 'RESIDENT'
                }
            });
        }

        const { memberId: _, ...complaintData } = data;

        const complaint = await this.prisma.client.complaint.create({
            data: { 
                ...complaintData, 
                memberId: member.id,
                tenantId: tenantId
            }
        });

        console.log(`[createComplaint] Created complaint successfully:`, complaint);
        return complaint;
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

    async addProgressNote(id: string, data: { message: string; photos?: string[]; status?: string; updatedBy?: string }) {
        const complaint = await this.prisma.reader.complaint.findUnique({
            where: { id }
        });
        if (!complaint) {
            throw new NotFoundException('Complaint not found');
        }

        let currentNotes: any[] = [];
        if (complaint.progressNotes) {
            try {
                currentNotes = Array.isArray(complaint.progressNotes)
                    ? complaint.progressNotes
                    : JSON.parse(complaint.progressNotes as string) || [];
            } catch (e) {
                currentNotes = [];
            }
        }

        const newNote = {
            id: Math.random().toString(36).substring(2, 9),
            message: data.message,
            photos: data.photos || [],
            updatedBy: data.updatedBy || 'Staff',
            createdAt: new Date().toISOString(),
            status: data.status || complaint.status
        };

        currentNotes.push(newNote);

        return this.prisma.client.complaint.update({
            where: { id },
            data: {
                progressNotes: currentNotes as any,
                ...(data.status ? { status: data.status as any } : {})
            }
        });
    }

    // ─── Visitors / Gatepass ────────────────────────────────────
    async getVisitors(memberId?: string) {
        let queryFilter: any = {};
        if (memberId) {
            // Find the member record if memberId is actually a global Auth userId or a direct CUID
            const member = await this.prisma.reader.member.findFirst({
                where: {
                    OR: [
                        { id: memberId },
                        { userId: memberId }
                    ]
                }
            });
            if (member) {
                queryFilter = { memberId: member.id };
            } else {
                queryFilter = { memberId };
            }
        }

        const visitors = await this.prisma.reader.visitor.findMany({
            where: queryFilter,
            orderBy: { createdAt: 'desc' }
        });

        return visitors.map((visitor) => {
            const visitDate = new Date(visitor.createdAt).toLocaleDateString('en-GB');
            const visitTime = new Date(visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return {
                ...visitor,
                visitorName: visitor.name,
                personsCount: 1, // Default fallback
                visitDate,
                visitTime
            };
        });
    }

    async getGatepassDetails(idOrPassCode: string) {
        let visitor = await this.prisma.reader.visitor.findUnique({
            where: { id: idOrPassCode },
            include: { member: true }
        });

        if (!visitor) {
            visitor = await this.prisma.reader.visitor.findFirst({
                where: { passCode: idOrPassCode },
                include: { member: true }
            });
        }

        if (!visitor) {
            throw new NotFoundException('Gatepass not found');
        }

        const visitDate = new Date(visitor.createdAt).toLocaleDateString('en-GB');
        const visitTime = new Date(visitor.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
            ...visitor,
            visitorName: visitor.name,
            personsCount: 1, // Default fallback
            visitDate,
            visitTime
        };
    }

    async approveGatepassEntry(
        id: string,
        securityMemberId: string,
        updates?: { name?: string; phone?: string; vehicleNumber?: string; purpose?: string }
    ) {
        const visitor = await this.prisma.reader.visitor.findUnique({
            where: { id }
        });

        if (!visitor) {
            throw new NotFoundException('Gatepass not found');
        }

        const name = updates?.name !== undefined ? updates.name : visitor.name;
        const phone = updates?.phone !== undefined ? updates.phone : visitor.phone;
        const vehicleNumber = updates?.vehicleNumber !== undefined ? updates.vehicleNumber : visitor.vehicleNumber;
        const purpose = updates?.purpose !== undefined ? updates.purpose : visitor.purpose;

        const updated = await this.prisma.client.visitor.update({
            where: { id },
            data: {
                status: 'APPROVED',
                entryTime: new Date(),
                name,
                phone,
                vehicleNumber,
                purpose
            }
        });

        // Automatically create a visitor entry in the visitor register
        await this.prisma.client.visitorEntry.create({
            data: {
                visitorName: name,
                phone: phone,
                purpose: purpose,
                category: visitor.category || 'Visitor',
                unitToVisit: visitor.unitToVisit || 'N/A',
                vehicleNumber: vehicleNumber,
                gatepassId: visitor.id,
                loggedBy: securityMemberId,
                description: visitor.description,
                inTime: new Date()
            }
        });

        return updated;
    }

    async createGatepass(userId: string, data: any) {
        // Robust lookup checking both ID and global Auth userId
        let member = await this.prisma.reader.member.findFirst({
            where: { 
                OR: [
                    { id: userId },
                    { userId: userId }
                ],
                ...(data.tenantId ? { tenantId: data.tenantId } : {})
            }
        });

        if (!member) {
            console.log(`Member not found for user ${userId}. Creating on the fly...`);
            const fallbackPhone = data.residentPhone || `dummy-${Math.random().toString().slice(2, 10)}`;
            member = await this.prisma.client.member.create({
                data: {
                    userId: userId,
                    tenantId: data.tenantId || 'resido-core', 
                    name: data.residentName || 'Default Member',
                    phone: fallbackPhone,
                    role: 'RESIDENT'
                }
            });
        }

        let passCode = '';
        let isUnique = false;
        while (!isUnique) {
            passCode = Math.floor(1000 + Math.random() * 9000).toString();
            const existing = await this.prisma.reader.visitor.findUnique({
                where: {
                    tenantId_passCode: {
                        tenantId: member.tenantId,
                        passCode
                    }
                }
            });
            if (!existing) {
                isUnique = true;
            }
        }
        
        const visitorData = {
            tenantId: member.tenantId,
            name: data.visitorName || data.name || '',
            phone: data.phone || data.mobile || '0000000000', 
            purpose: data.purpose,
            passCode,
            status: 'PENDING' as any,
            memberId: member.id, 
            vehicleNumber: data.vehicleNumber,
            category: data.category || 'Visitor',
            description: data.description,
            personsCount: typeof data.personsCount === 'string' ? parseInt(data.personsCount) || 1 : data.personsCount || 1,
            unitToVisit: data.unitToVisit,
        };

        return this.prisma.client.visitor.create({
            data: visitorData
        });
    }

    // ─── Events / Calendar ──────────────────────────────────────
    async getEvents(memberId: string) {
        const events = await this.prisma.reader.event.findMany({
            orderBy: { startDate: 'asc' }
        });

        if (!memberId) {
            return events;
        }

        const member = await this.prisma.reader.member.findUnique({ where: { id: memberId } });
        if (!member) {
            return events;
        }

        const isAdmin = member.role === 'APARTMENT_ADMIN';
        if (isAdmin) {
            return events;
        }

        const targetAudience = member.role === 'MEMBER' ? 'MEMBERS' : (member.role === 'RESIDENT' ? 'RESIDENTS' : 'STAFF');
        return events.filter((e: any) => {
            const aud = e.audience || [];
            return e.createdBy === memberId ||
                   (e.sharedWithIds && e.sharedWithIds.includes(memberId)) ||
                   aud.length === 0 ||
                   aud.includes(targetAudience);
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

    async deleteEvent(id: string) {
        return this.prisma.client.event.delete({ where: { id } });
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

    // ─── Blocks & Units ────────────────────────────────────────
    async getBlocks() {
        const blocks = await this.prisma.reader.block.findMany({
            include: { _count: { select: { units: true } } },
            orderBy: { name: 'asc' }
        });

        if (blocks.length === 0) {
            const unitsCount = await this.prisma.reader.unit.count();
            return [{ id: 'default', name: 'Block 1', _count: { units: unitsCount } }];
        }

        return blocks;
    }


    async createBlock(data: any) {
        try {
            // Find or create a default apartment for this tenant
            let apartment = await this.prisma.reader.apartment.findFirst();
            
            if (!apartment) {
                apartment = await this.prisma.client.apartment.create({
                    data: {
                        tenantId: data.tenantId || '',
                        name: 'Default Apartment',
                        address: '',
                        city: '',
                        state: '',
                        pincode: ''
                    }
                });
            }

            return await this.prisma.client.block.create({
                data: {
                    name: data.name,
                    apartmentId: apartment.id,
                    tenantId: data.tenantId || ''
                }
            });
        } catch (error: any) {
            console.error('[Error in createBlock] Input data:', JSON.stringify(data));
            console.error('[Error in createBlock] Exception details:', error);
            throw error;
        }
    }

    async updateBlock(id: string, data: any) {
        return this.prisma.client.block.update({
            where: { id },
            data: { name: data.name }
        });
    }

    async deleteBlock(id: string) {
        const block = await this.prisma.reader.block.findUnique({
            where: { id },
            include: { _count: { select: { units: true } } }
        });
        if (block && block._count.units > 0) {
            throw new BadRequestException('Cannot delete block with existing units. Please delete the units first.');
        }
        return this.prisma.client.block.delete({ where: { id } });
    }

    async getUnits(blockId: string) {
        if (blockId === 'default') {
            return this.prisma.reader.unit.findMany({
                include: { families: { include: { members: true } } },
                orderBy: { number: 'asc' }
            });
        }
        return this.prisma.reader.unit.findMany({
            where: { blockId },
            include: { families: { include: { members: true } } },
            orderBy: { number: 'asc' }
        });
    }



    async createUnit(data: any) {
        try {
            let blockId = data.blockId;

            if (blockId === 'default') {
                let block = await this.prisma.reader.block.findFirst({
                    where: { name: 'Block 1' }
                });

                if (!block) {
                    let apartment = await this.prisma.reader.apartment.findFirst();
                    if (!apartment) {
                        apartment = await this.prisma.client.apartment.create({
                            data: {
                                tenantId: data.tenantId || '',
                                name: 'Default Apartment',
                                address: '',
                                city: '',
                                state: '',
                                pincode: ''
                            }
                        });
                    }

                    block = await this.prisma.client.block.create({
                        data: {
                            name: 'Block 1',
                            apartmentId: apartment.id,
                            tenantId: data.tenantId || ''
                        }
                    });
                }
                blockId = block.id;
            }

            return await this.prisma.client.unit.create({
                data: {
                    number: data.number,
                    floor: parseInt(data.floor) || 0,
                    blockId: blockId,
                    tenantId: data.tenantId || ''
                }
            });
        } catch (error: any) {
            console.error('[Error in createUnit] Input data:', JSON.stringify(data));
            console.error('[Error in createUnit] Exception details:', error);
            throw error;
        }
    }

    async updateUnit(id: string, data: any) {
        return this.prisma.client.unit.update({
            where: { id },
            data: { number: data.number }
        });
    }

    async deleteUnit(id: string) {
        const unit = await this.prisma.reader.unit.findUnique({
            where: { id },
            include: { _count: { select: { families: true } } }
        });
        if (unit && unit._count.families > 0) {
            throw new BadRequestException('Cannot delete unit with registered residents. Please remove the residents first.');
        }
        return this.prisma.client.unit.delete({ where: { id } });
    }

    // ─── Rules ──────────────────────────────────────────────────

    async getRules(memberId?: string) {
        const rules = await (this.prisma.reader as any).rule.findMany({ orderBy: { title: 'asc' } });
        
        if (!memberId) {
            return rules;
        }

        const member = await this.prisma.reader.member.findUnique({ where: { id: memberId } });
        if (!member) {
            return rules;
        }

        const isAdmin = member.role === 'APARTMENT_ADMIN';
        if (isAdmin) {
            return rules;
        }

        const targetAudience = member.role === 'MEMBER' ? 'MEMBERS' : (member.role === 'RESIDENT' ? 'RESIDENTS' : 'STAFF');
        return rules.filter((r: any) => {
            const aud = r.audience || [];
            return aud.length === 0 || aud.includes(targetAudience);
        });
    }

    async createRule(data: any) {
        return (this.prisma.client as any).rule.create({ data });
    }

    async deleteRule(id: string) {
        return (this.prisma.client as any).rule.delete({ where: { id } });
    }

    async getSummaryStats() {
        const totalMembers = await this.prisma.reader.member.count({
            where: { role: 'RESIDENT' as any }
        });
        const totalFamilies = await this.prisma.reader.family.count();
        const totalUnits = await this.prisma.reader.unit.count();
        
        const occupiedUnits = await this.prisma.reader.unit.count({
            where: { families: { some: {} } }
        });
        const emptyUnits = Math.max(0, totalUnits - occupiedUnits);

        const securityStaff = await this.prisma.reader.member.count({ where: { role: 'SECURITY_STAFF' as any } });
        const cleaningStaff = await this.prisma.reader.member.count({ where: { role: 'CLEANING_STAFF' as any } });
        const adminStaff = await this.prisma.reader.member.count({ where: { role: 'ADMIN_STAFF' as any } });
        const maintenanceStaff = await this.prisma.reader.member.count({
            where: { role: { in: ['MAINTENANCE_STAFF', 'STAFF'] as any } }
        });

        const totalStaff = securityStaff + cleaningStaff + adminStaff + maintenanceStaff;

        const allBills = await this.prisma.reader.maintenanceBill.findMany({
            select: {
                totalAmount: true,
                status: true,
                unit: {
                    select: {
                        number: true,
                        block: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        let totalInvoiced = 0;
        let totalCollected = 0;
        let totalDues = 0;
        let unitsPaid = 0;
        let unitsDue = 0;
        const pendingUnitsMap = new Map<string, { unit: string; amount: number }>();

        allBills.forEach((bill: any) => {
            totalInvoiced += bill.totalAmount;
            if (bill.status === 'PAID') {
                totalCollected += bill.totalAmount;
                unitsPaid++;
            } else {
                totalDues += bill.totalAmount;
                unitsDue++;
                const unitName = `${bill.unit?.block?.name || 'Block'} - ${bill.unit?.number || 'Unit'}`;
                const existing = pendingUnitsMap.get(unitName);
                if (existing) {
                    existing.amount += bill.totalAmount;
                } else {
                    pendingUnitsMap.set(unitName, { unit: unitName, amount: bill.totalAmount });
                }
            }
        });

        const recentPendingDues = Array.from(pendingUnitsMap.values())
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const visitorsToday = await this.prisma.reader.visitor.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });

        const pendingComplaints = await this.prisma.reader.complaint.count({ where: { status: 'PENDING' as any } });
        const progressComplaints = await this.prisma.reader.complaint.count({ where: { status: 'IN_PROGRESS' as any } });
        const resolvedComplaints = await this.prisma.reader.complaint.count({ where: { status: 'RESOLVED' as any } });

        const gatepassesCreated = await this.prisma.reader.visitor.count();
        const gatepassesApproved = await this.prisma.reader.visitor.count({ where: { status: 'APPROVED' as any } });

        return {
            people: {
                totalMembers,
                totalFamilies,
                occupiedUnits,
                emptyUnits,
                totalStaff,
                staffRoles: {
                    SECURITY: securityStaff,
                    CLEANING: cleaningStaff,
                    ADMIN: adminStaff,
                    MAINTENANCE: maintenanceStaff
                }
            },
            finance: {
                totalInvoiced,
                totalCollected,
                totalDues,
                unitsPaid,
                unitsDue,
                recentPendingDues
            },
            operations: {
                visitorsToday,
                activeComplaints: {
                    PENDING: pendingComplaints,
                    IN_PROGRESS: progressComplaints,
                    RESOLVED: resolvedComplaints
                },
                gatepasses: {
                    totalCreated: gatepassesCreated,
                    totalApproved: gatepassesApproved
                }
            }
        };
    }
}
