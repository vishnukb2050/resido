import { Injectable, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import Redis from 'ioredis';
import { pushNotification, pushNotificationMany } from '../../common/notify.helper';

@Injectable()
export class CommunityService {
    constructor(
        private prisma: PrismaService,
        @Inject('REDIS_CLIENT') private redis: Redis,
    ) {}

    // Defensive upper bounds for tenant-scoped list reads. These are single-
    // community queries, so the cap only matters for pathologically large
    // societies — but an uncapped findMany there would OOM the pod and produce
    // a multi-MB JSON payload the mobile client then has to parse. The caps are
    // far above any realistic community size, so normal "fetch all" semantics
    // are unchanged; they only bound the worst case.
    private static readonly MAX_STRUCTURE_ROWS = 5000; // members / units
    private static readonly MAX_CONTENT_ROWS = 1000; // gallery / events / visitors

    // ─── Notices ────────────────────────────────────────────────
    async getNotices(skip = 0, take = 50) {
        return this.prisma.reader.notice.findMany({
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: Math.min(Math.max(take, 1), 100),
        });
    }

    async createNotice(data: any) {
        const notice = await this.prisma.client.notice.create({ data });

        // Push to all active community members (fire-and-forget).
        setImmediate(async () => {
            try {
                const members = await this.prisma.reader.member.findMany({
                    where: { isActive: true },
                    select: { userId: true },
                });
                const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
                await pushNotificationMany(userIds, {
                    title: '📢 New Notice',
                    body: (notice as any).title || 'A new notice has been posted.',
                    data: { type: 'NOTICE', noticeId: notice.id },
                });
            } catch (e: any) {
                console.warn('[createNotice] notification dispatch failed:', e?.message);
            }
        });

        return notice;
    }

    // ─── Polls ──────────────────────────────────────────────────
    async getPolls(skip = 0, take = 50) {
        return this.prisma.reader.poll.findMany({
            include: { options: { include: { _count: { select: { votes: true } } } } },
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: Math.min(Math.max(take, 1), 100),
        });
    }

    async votePoll(args: { authUserId?: string; authUserPhone?: string; optionId: string }) {
        const member = await this.resolveMember({
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });
        if (!member) {
            throw new BadRequestException('Could not resolve your member profile in this community');
        }
        if (!args.optionId) {
            throw new BadRequestException('optionId is required');
        }
        // Prevent double-vote on the same poll option.
        const existing = await this.prisma.reader.pollVote.findFirst({
            where: { memberId: member.id, optionId: args.optionId },
        });
        if (existing) {
            throw new BadRequestException('You have already voted on this option');
        }
        return this.prisma.client.pollVote.create({
            data: {
                member: { connect: { id: member.id } },
                option: { connect: { id: args.optionId } },
            } as any,
        });
    }

    // ─── Member resolution helper ────────────────────────────────
    /**
     * Resolves a workspace `Member` from any combination of:
     *   - resident-service Member.id (CUID)
     *   - auth-service User.id (CUID stored in Member.userId)
     *   - phone (from the JWT, unique within the tenant)
     *
     * Results are cached in Redis under `member:{tenantId}:{key}` for 5 minutes
     * to eliminate the repeated multi-OR DB fan-out on every community request.
     * When found via phone, links `Member.userId` so future lookups hit fast.
     */
    private async resolveMember(input: {
        candidateId?: string | null;
        authUserId?: string | null;
        phone?: string | null;
    }) {
        const { candidateId, authUserId, phone } = input;
        const tenantId = PrismaService.als.getStore()?.tenantId ?? 'default';
        const CACHE_TTL = 300; // 5 minutes

        // Build an ordered list of cache keys to check (most specific first).
        const cacheKeys: string[] = [];
        if (authUserId) cacheKeys.push(`member:${tenantId}:u:${authUserId}`);
        if (candidateId && candidateId !== authUserId) cacheKeys.push(`member:${tenantId}:u:${candidateId}`);
        if (phone) cacheKeys.push(`member:${tenantId}:p:${phone}`);

        // Check cache before hitting DB.
        for (const key of cacheKeys) {
            try {
                const cached = await this.redis.get(key);
                if (cached) return JSON.parse(cached);
            } catch {
                // Cache miss or parse error — fall through to DB
            }
        }

        // Cache miss — build the OR filter and query the replica.
        const ors: any[] = [];
        if (candidateId) ors.push({ id: candidateId }, { userId: candidateId });
        if (authUserId && authUserId !== candidateId) {
            ors.push({ id: authUserId }, { userId: authUserId });
        }
        if (phone) ors.push({ phone });

        if (!ors.length) return null;

        const member = await this.prisma.reader.member.findFirst({
            where: { OR: ors },
        });
        if (!member) return null;

        // Auto-link the member's userId so subsequent lookups don't depend on phone.
        if (authUserId && !member.userId) {
            try {
                await this.prisma.client.member.update({
                    where: { id: member.id },
                    data: { userId: authUserId },
                });
                // Reflect the link in the object we are about to cache.
                (member as any).userId = authUserId;
            } catch (err: any) {
                console.warn(`[resolveMember] auto-link userId failed for ${member.id}:`, err?.message);
            }
        }

        // Populate all cache keys so any future lookup variant is a cache hit.
        const serialized = JSON.stringify(member);
        const pipeline = this.redis.pipeline();
        if (authUserId) pipeline.setex(`member:${tenantId}:u:${authUserId}`, CACHE_TTL, serialized);
        if (candidateId && candidateId !== authUserId) pipeline.setex(`member:${tenantId}:u:${candidateId}`, CACHE_TTL, serialized);
        if (phone) pipeline.setex(`member:${tenantId}:p:${phone}`, CACHE_TTL, serialized);
        // Always cache by the canonical member id so direct-id lookups are fast too.
        pipeline.setex(`member:${tenantId}:u:${member.id}`, CACHE_TTL, serialized);
        pipeline.exec().catch((err: any) =>
            console.warn('[resolveMember] Redis pipeline error:', err?.message),
        );

        return member;
    }

    /**
     * Invalidates all Redis cache entries for a member.
     * Call this after any mutation that changes member identity fields
     * (role change, phone update, deactivation).
     */
    async invalidateMemberCache(member: { id: string; userId?: string | null; phone?: string | null }) {
        const tenantId = PrismaService.als.getStore()?.tenantId ?? 'default';
        const keys: string[] = [`member:${tenantId}:u:${member.id}`];
        if (member.userId) keys.push(`member:${tenantId}:u:${member.userId}`);
        if (member.phone) keys.push(`member:${tenantId}:p:${member.phone}`);
        if (keys.length) await this.redis.del(...keys);
    }

    // ─── Complaints ─────────────────────────────────────────────
    async getComplaints(args: {
        memberId?: string;
        staffId?: string;
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
    }) {
        const { memberId, staffId, authUserId, authUserPhone, authUserRole } = args;
        const tenantId = PrismaService.als.getStore()?.tenantId;
        const ADMIN_ROLES = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF', 'ACCOUNTS_STAFF', 'MANAGER_STAFF'];
        const isAdminRole = !!authUserRole && ADMIN_ROLES.includes(authUserRole);

        console.log(
            `[getComplaints] tenant=${tenantId} memberId=${memberId} staffId=${staffId} authUser=${authUserId} role=${authUserRole}`,
        );

        // Admin sees everything in the tenant when no scoping params provided.
        if (isAdminRole && !memberId && !staffId) {
            return this.enrichComplaints(
                await this.prisma.reader.complaint.findMany({
                    include: { member: { select: { id: true, name: true, phone: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: CommunityService.MAX_CONTENT_ROWS,
                }),
            );
        }

        const whereOr: any[] = [];

        if (memberId) {
            const member = await this.resolveMember({
                candidateId: memberId,
                authUserId,
                phone: authUserPhone,
            });
            if (member) whereOr.push({ memberId: member.id });
        }

        if (staffId) {
            const staff = await this.resolveMember({
                candidateId: staffId,
                authUserId,
                phone: authUserPhone,
            });
            if (staff) whereOr.push({ assignedTo: staff.id });
        }

        // No explicit scope but we know the caller — show what relates to them
        if (!memberId && !staffId && (authUserId || authUserPhone)) {
            const self = await this.resolveMember({
                candidateId: authUserId,
                authUserId,
                phone: authUserPhone,
            });
            if (self) {
                whereOr.push({ memberId: self.id }, { assignedTo: self.id });
            }
        }

        if (!whereOr.length) {
            console.log('[getComplaints] no resolvable identity — returning []');
            return [];
        }

        const complaints = await this.prisma.reader.complaint.findMany({
            where: { OR: whereOr },
            include: { member: { select: { id: true, name: true, phone: true } } },
            orderBy: { createdAt: 'desc' },
            take: CommunityService.MAX_CONTENT_ROWS,
        });

        return this.enrichComplaints(complaints);
    }

    private async enrichComplaints(complaints: any[]) {
        const staffIds = Array.from(
            new Set(complaints.map((c: any) => c.assignedTo).filter(Boolean)),
        );
        if (!staffIds.length) {
            return complaints.map((c: any) => ({ ...c, assignedTo: null }));
        }
        const staffMembers = await this.prisma.reader.member.findMany({
            where: { id: { in: staffIds as string[] } },
            select: { id: true, name: true, phone: true, role: true },
        });
        const staffMap = new Map(staffMembers.map((s: any) => [s.id, s]));
        return complaints.map((c: any) => ({
            ...c,
            assignedTo: c.assignedTo ? staffMap.get(c.assignedTo) || null : null,
        }));
    }

    async createComplaint(userId: string, data: any) {
        const tenantId = PrismaService.als.getStore()?.tenantId || data.tenantId;
        if (!tenantId) {
            throw new BadRequestException('Tenant context missing');
        }

        const { authUserId, authUserPhone, memberId: _bodyMemberId, ...complaintData } = data;

        let member = await this.resolveMember({
            candidateId: userId,
            authUserId: authUserId || userId,
            phone: authUserPhone,
        });

        if (!member && authUserPhone) {
            console.log(
                `[createComplaint] no member found for user=${userId} phone=${authUserPhone}; creating minimal record`,
            );
            member = await this.prisma.client.member.create({
                data: {
                    tenantId,
                    userId: authUserId || userId || null,
                    name: data.raisedByName || 'Resident',
                    phone: authUserPhone,
                    role: 'RESIDENT',
                },
            });
        }

        if (!member) {
            throw new BadRequestException(
                'Could not resolve a community member for this user. Please ask the admin to add you to the directory.',
            );
        }

        const complaint = await this.prisma.client.complaint.create({
            data: {
                ...complaintData,
                tenantId,
                memberId: member.id,
                status: complaintData.status || 'OPEN',
            },
        });

        console.log(`[createComplaint] created ${complaint.id} for member=${member.id}`);
        return complaint;
    }

    async assignComplaint(id: string, staffId: string) {
        const staff = await this.resolveMember({ candidateId: staffId });
        if (!staff) {
            throw new BadRequestException('Selected staff member not found.');
        }
        const updated = await this.prisma.client.complaint.update({
            where: { id },
            data: {
                assignedTo: staff.id,
                status: 'IN_PROGRESS',
            },
        });

        // Notify the assigned staff member (fire-and-forget).
        if (staff.userId) {
            pushNotification({
                userId: staff.userId,
                title: '🔧 Complaint Assigned to You',
                body: `A complaint has been assigned to you. Please review and take action.`,
                data: { type: 'COMPLAINT', complaintId: id },
            });
        }

        return updated;
    }

    async updateComplaintStatus(id: string, status: any) {
        return this.prisma.client.complaint.update({
            where: { id },
            data: { status }
        });
    }

    async addProgressNote(
        id: string,
        data: {
            message: string;
            photos?: string[];
            status?: string;
            updatedBy?: string;
            authUserId?: string;
            authUserPhone?: string;
        },
    ) {
        const complaint = await this.prisma.reader.complaint.findUnique({ where: { id } });
        if (!complaint) {
            throw new NotFoundException('Complaint not found');
        }

        let currentNotes: any[] = [];
        if (complaint.progressNotes) {
            try {
                currentNotes = Array.isArray(complaint.progressNotes)
                    ? (complaint.progressNotes as any[])
                    : JSON.parse(complaint.progressNotes as string) || [];
            } catch {
                currentNotes = [];
            }
        }

        let updaterLabel = data.updatedBy;
        if (!updaterLabel && (data.authUserId || data.authUserPhone)) {
            const me = await this.resolveMember({
                candidateId: data.authUserId,
                authUserId: data.authUserId,
                phone: data.authUserPhone,
            });
            if (me) {
                updaterLabel = `${me.name}${me.role && me.role !== 'RESIDENT' ? ` (${me.role.replace('_STAFF', '')})` : ''}`;
            }
        }

        const newNote = {
            id: Math.random().toString(36).substring(2, 9),
            message: data.message,
            photos: data.photos || [],
            updatedBy: updaterLabel || 'Staff',
            createdAt: new Date().toISOString(),
            status: data.status || complaint.status,
        };

        currentNotes.push(newNote);

        return this.prisma.client.complaint.update({
            where: { id },
            data: {
                progressNotes: currentNotes as any,
                ...(data.status ? { status: data.status as any } : {}),
            },
        });
    }

    // ─── Cleaning logs ──────────────────────────────────────────
    async getCleaningLogs(skip = 0, take = 30) {
        const safeTake = Math.min(Math.max(take, 1), 100);
        return (this.prisma.reader as any).cleaningLog.findMany({
            orderBy: { createdAt: 'desc' },
            skip: Math.max(skip, 0),
            take: safeTake,
        });
    }

    async createCleaningLog(
        loggedBy: string,
        data: { date?: string; areas: string[]; notes?: string; photoUrls?: string[] },
    ) {
        return (this.prisma.client as any).cleaningLog.create({
            data: {
                loggedBy,
                date: data.date ? new Date(data.date) : new Date(),
                areas: Array.isArray(data.areas) ? data.areas : [],
                notes: data.notes,
                photoUrls: Array.isArray(data.photoUrls) ? data.photoUrls : [],
            },
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
            orderBy: { createdAt: 'desc' },
            take: CommunityService.MAX_CONTENT_ROWS,
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
        updates?: { 
            name?: string; 
            phone?: string; 
            vehicleNumber?: string; 
            purpose?: string;
            category?: string;
            description?: string;
            unitToVisit?: string;
            inTime?: string;
        }
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

        const category = updates?.category !== undefined ? updates.category : (visitor.category || 'Visitor');
        const description = updates?.description !== undefined ? updates.description : visitor.description;
        const unitToVisit = updates?.unitToVisit !== undefined ? updates.unitToVisit : (visitor.unitToVisit || 'N/A');
        const inTime = updates?.inTime !== undefined ? new Date(updates.inTime) : new Date();

        const updated = await this.prisma.client.visitor.update({
            where: { id },
            data: {
                status: 'APPROVED',
                entryTime: inTime,
                name,
                phone,
                vehicleNumber,
                purpose,
                category,
                description,
                unitToVisit
            }
        });

        // Automatically create a visitor entry in the visitor register
        await this.prisma.client.visitorEntry.create({
            data: {
                tenantId: visitor.tenantId,
                visitorName: name,
                phone: phone,
                purpose: purpose,
                category: category,
                unitToVisit: unitToVisit,
                vehicleNumber: vehicleNumber,
                gatepassId: visitor.id,
                loggedBy: securityMemberId,
                description: description,
                inTime: inTime
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

        /**
         * Generate a cryptographically random 6-character alphanumeric passcode.
         * Previous implementation: 4-digit (9,000 possibilities) with a pre-check
         * loop — susceptible to TOCTOU race (two concurrent inserts could read the
         * same "no conflict" and both try to insert the same code). 6 chars gives
         * ~2.1 billion possibilities, making collisions effectively impossible, and
         * we retry on P2002 (unique constraint) instead of pre-checking, which is
         * the only race-safe pattern.
         */
        const generatePassCode = (): string => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0 to avoid confusion
            const bytes = require('crypto').randomBytes(6);
            return Array.from(bytes as Uint8Array)
                .map((b: number) => chars[b % chars.length])
                .join('');
        };

        let createdVisitor: any;
        for (let attempt = 0; attempt < 5; attempt++) {
            const passCode = generatePassCode();
            try {
                createdVisitor = await this.prisma.client.visitor.create({
                    data: {
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
                    },
                });
                break; // success
            } catch (err: any) {
                if (err?.code === 'P2002') continue; // unique conflict → retry with a new code
                throw err;
            }
        }
        if (!createdVisitor) {
            throw new Error('Could not generate a unique visitor passcode. Please try again.');
        }
        return createdVisitor;
    }


    /**
     * Audience buckets a member belongs to. A user can belong to MULTIPLE
     * buckets because the same person could be both a RESIDENT and a MEMBER
     * (community owner). APARTMENT_ADMIN returns `null` to mean "see all".
     *
     * Staff roles map to `STAFF` only. Plain residents map to `RESIDENTS` (and
     * `MEMBERS` since residents are members of the community too — admins who
     * select the "Members" audience would otherwise unintentionally exclude
     * residents). `MEMBER` role maps to `MEMBERS` only.
     */
    private audienceBucketsForRole(role?: string | null): string[] | null {
        if (!role) return [];
        const upper = String(role).toUpperCase();
        if (upper === 'APARTMENT_ADMIN') return null; // admin sees all
        if (upper === 'RESIDENT') return ['RESIDENTS', 'MEMBERS'];
        if (upper === 'MEMBER') return ['MEMBERS'];
        if (upper === 'NOT_APPLICABLE') return [];
        return ['STAFF'];
    }

    async getEvents(args: {
        memberId?: string;
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
    }) {
        const events = await this.prisma.reader.event.findMany({
            orderBy: { startDate: 'asc' },
            take: CommunityService.MAX_CONTENT_ROWS,
        });

        const member = await this.resolveMember({
            candidateId: args.memberId,
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });

        // Prefer the JWT-supplied workspace role (the role the user is currently
        // signed in as), and fall back to Member.role if the JWT didn't carry
        // one. A member may have multiple roles across workspaces, so trusting
        // the workspace role first prevents cross-role bleed-through.
        const role = args.authUserRole || member?.role;
        const isAdmin = String(role || '').toUpperCase() === 'APARTMENT_ADMIN';
        if (isAdmin) return events;

        const myIds = new Set<string>();
        if (member?.id) myIds.add(member.id);
        if (member?.userId) myIds.add(member.userId);
        if (args.authUserId) myIds.add(args.authUserId);
        if (args.memberId) myIds.add(args.memberId);

        const buckets = this.audienceBucketsForRole(role) || [];

        const filtered = events.filter((e: any) => {
            const aud: string[] = Array.isArray(e.audience) ? e.audience : [];
            const sharedIds: string[] = Array.isArray(e.sharedWithIds) ? e.sharedWithIds : [];

            const isCreator = e.createdBy && myIds.has(e.createdBy);
            const isShared = sharedIds.some((sid: string) => myIds.has(sid));

            if (isCreator || isShared) return true;

            // Anything other than COMMUNITY (PRIVATE / GROUPS / CONTACTS)
            // is share-list only; if you weren't on the share list, hide it.
            if (e.visibility && e.visibility !== 'COMMUNITY') return false;

            // Legacy community events without an audience are visible to all.
            if (aud.length === 0) return true;

            // Otherwise the rule audience must overlap the user's buckets.
            return buckets.some((b) => aud.includes(b));
        });

        console.log('[getEvents] role=', role, 'buckets=', buckets, 'returned', filtered.length, 'of', events.length);
        return filtered;
    }

    async createEvent(args: {
        memberId?: string;
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
        data: any;
    }) {
        const { memberId: _omitMemberId, ...eventData } = args.data || {};

        // Sanitize audience to allowed values. NOTE: an empty audience on a
        // COMMUNITY event means "visible to all roles", which is rarely what
        // admins want — the mobile UI requires at least one bucket to be
        // selected before submitting.
        const allowed = ['MEMBERS', 'RESIDENTS', 'STAFF'];
        const audience = Array.isArray(eventData.audience)
            ? Array.from(
                new Set(
                    eventData.audience
                        .map((a: any) => String(a || '').toUpperCase().trim())
                        .filter((a: string) => allowed.includes(a)),
                ),
            )
            : [];

        const creator = await this.resolveMember({
            candidateId: args.memberId,
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });

        // For COMMUNITY events, only admins should be able to broadcast — but we still
        // allow individuals to create PRIVATE / GROUPS / CONTACTS events.
        if (
            (eventData.visibility === 'COMMUNITY' || !eventData.visibility) &&
            audience.length > 0
        ) {
            const role = creator?.role || args.authUserRole;
            if (role !== 'APARTMENT_ADMIN') {
                throw new ForbiddenException('Only community admins can broadcast events to members, residents, or staff.');
            }
        }

        const event = await this.prisma.client.event.create({
            data: {
                ...eventData,
                audience,
                createdBy: creator?.id || args.authUserId || args.memberId || '',
            },
        });

        // Push to all matching members for COMMUNITY events (fire-and-forget).
        const isCommunityBroadcast =
            (eventData.visibility === 'COMMUNITY' || !eventData.visibility) && audience.length > 0;
        if (isCommunityBroadcast) {
            setImmediate(async () => {
                try {
                    // Map audience buckets to actual MemberRole enum values.
                    const roleMap: Record<string, string[]> = {
                        MEMBERS: ['MEMBER', 'RESIDENT'],
                        RESIDENTS: ['RESIDENT', 'MEMBER'],
                        STAFF: ['SECURITY_STAFF', 'MAINTENANCE_STAFF', 'CLEANING_STAFF', 'CARETAKER', 'ACCOUNTS_STAFF', 'ADMIN_STAFF', 'STAFF', 'SERVICE_STAFF', 'MANAGER_STAFF'],
                    };
                    const roles = Array.from(
                        new Set(audience.flatMap((a: string) => roleMap[a] || [])),
                    );
                    const where: any = { isActive: true };
                    if (roles.length > 0) where.role = { in: roles };
                    const members = await this.prisma.reader.member.findMany({
                        where,
                        select: { userId: true },
                    });
                    const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
                    await pushNotificationMany(userIds, {
                        title: '🎉 New Event',
                        body: `${(event as any).title || 'A new community event has been created.'}`,
                        data: { type: 'EVENT', eventId: event.id },
                    });
                } catch (e: any) {
                    console.warn('[createEvent] notification dispatch failed:', e?.message);
                }
            });
        }

        return event;
    }

    async deleteEvent(
        id: string,
        ctx: { authUserId?: string; authUserPhone?: string; authUserRole?: string },
    ) {
        const event = await this.prisma.reader.event.findUnique({ where: { id } });
        if (!event) throw new NotFoundException('Event not found.');

        const member = await this.resolveMember({
            authUserId: ctx.authUserId,
            phone: ctx.authUserPhone,
        });
        const role = member?.role || ctx.authUserRole;
        const myIds = new Set<string>();
        if (member?.id) myIds.add(member.id);
        if (member?.userId) myIds.add(member.userId);
        if (ctx.authUserId) myIds.add(ctx.authUserId);

        const isOwner = !!event.createdBy && myIds.has(event.createdBy);
        const isAdmin = role === 'APARTMENT_ADMIN';
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException('You can only delete events you created (or any event if you are the community admin).');
        }

        return this.prisma.client.event.delete({ where: { id } });
    }

    // ─── Members ────────────────────────────────────────────────
    // Returns enough metadata for downstream features (parking, billing,
    // staff mgmt) to map a Member back to their User (userId) and to
    // their unit/block via the family relationship. Extra fields are
    // optional on the client; consumers should treat unit info as
    // possibly-null (e.g. caretakers/admin staff don't have a family).
    async getMembers() {
        return this.prisma.reader.member.findMany({
            take: CommunityService.MAX_STRUCTURE_ROWS,
            select: {
                id: true,
                userId: true,
                name: true,
                phone: true,
                role: true,
                profilePhoto: true,
                familyId: true,
                family: {
                    select: {
                        id: true,
                        unit: {
                            select: {
                                id: true,
                                number: true,
                                floor: true,
                                blockId: true,
                                block: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    // ─── Gallery ────────────────────────────────────────────────
    async getGallery(folderId?: string) {
        return this.prisma.reader.gallery.findMany({
            where: folderId ? { folderId } : {},
            orderBy: { createdAt: 'desc' },
            take: CommunityService.MAX_CONTENT_ROWS,
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
            orderBy: { updatedAt: 'desc' },
            take: CommunityService.MAX_CONTENT_ROWS,
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
            orderBy: { name: 'asc' },
            take: CommunityService.MAX_CONTENT_ROWS,
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
                orderBy: { number: 'asc' },
                take: CommunityService.MAX_STRUCTURE_ROWS,
            });
        }
        return this.prisma.reader.unit.findMany({
            where: { blockId },
            include: { families: { include: { members: true } } },
            orderBy: { number: 'asc' },
            take: CommunityService.MAX_STRUCTURE_ROWS,
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

    /** Only community admins may create, update, or delete rules. */
    private async requireApartmentAdmin(ctx: {
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
    }) {
        const member = await this.resolveMember({
            authUserId: ctx.authUserId,
            phone: ctx.authUserPhone,
        });
        const role = member?.role || ctx.authUserRole;
        if (role !== 'APARTMENT_ADMIN') {
            throw new ForbiddenException('Only community admins can manage rules and regulations.');
        }
        return member;
    }

    // (audienceBucketsForRole is defined above near getEvents)

    async getRules(args: {
        memberId?: string;
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
    }) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) return [];

        let rules: any[] = [];
        try {
            rules = await (this.prisma.reader as any).rule.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: CommunityService.MAX_CONTENT_ROWS,
            });
        } catch (err: any) {
            console.warn('[getRules] failed', err?.message);
            return [];
        }

        const member = await this.resolveMember({
            candidateId: args.memberId,
            authUserId: args.authUserId,
            phone: args.authUserPhone,
        });

        // Prefer the JWT workspace role over Member.role for the same reason
        // as events (multi-role users).
        const role = args.authUserRole || member?.role;
        const isAdmin = String(role || '').toUpperCase() === 'APARTMENT_ADMIN';
        if (isAdmin) return rules;

        const buckets = this.audienceBucketsForRole(role) || [];

        const filtered = rules.filter((r: any) => {
            const aud: string[] = Array.isArray(r.audience) ? r.audience : [];
            // Legacy rules with no audience are visible to everyone in the
            // tenant; new rules must overlap with the caller's buckets.
            if (aud.length === 0) return true;
            return buckets.some((b) => aud.includes(b));
        });

        console.log('[getRules] role=', role, 'buckets=', buckets, 'returned', filtered.length, 'of', rules.length);
        return filtered;
    }

    async createRule(data: {
        title: string;
        description: string;
        category?: string;
        photoUrl?: string;
        audience?: string[];
        authUserId?: string;
        authUserPhone?: string;
        authUserRole?: string;
    }) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) {
            throw new BadRequestException(
                'Community context is required. Open your community workspace from the top switcher and try again.',
            );
        }

        if (!data?.title?.trim() || !data?.description?.trim()) {
            throw new BadRequestException('Title and description are required.');
        }

        await this.requireApartmentAdmin({
            authUserId: data.authUserId,
            authUserPhone: data.authUserPhone,
            authUserRole: data.authUserRole,
        });

        const allowed = ['MEMBERS', 'RESIDENTS', 'STAFF'];
        const audience = Array.isArray(data.audience)
            ? Array.from(
                new Set(
                    data.audience
                        .map((a: any) => String(a || '').toUpperCase().trim())
                        .filter((a: string) => allowed.includes(a)),
                ),
            )
            : [];
        if (audience.length === 0) {
            throw new BadRequestException('At least one audience (Members, Residents, or Staff) is required.');
        }

        const creator = await this.resolveMember({
            authUserId: data.authUserId,
            phone: data.authUserPhone,
        });

        try {
            // Pass tenantId explicitly to be safe even if ALS injection
            // is bypassed by extensions on some Prisma versions.
            return await (this.prisma.client as any).rule.create({
                data: {
                    tenantId,
                    title: data.title.trim(),
                    description: data.description.trim(),
                    category: (data.category || 'General').trim(),
                    photoUrl: data.photoUrl || null,
                    audience,
                    createdBy: creator?.id || null,
                },
            });
        } catch (err: any) {
            const code = err?.code;
            const msg = String(err?.message || '');
            console.error('[createRule] failed', { code, msg, tenantId });

            if (code === 'P2021' || /does not exist|relation.*rules/i.test(msg)) {
                throw new InternalServerErrorException(
                    'Rules table is not set up yet. Please redeploy resident-service to apply the latest schema.',
                );
            }
            if (typeof msg === 'string' && msg.includes('Unknown arg')) {
                throw new BadRequestException(
                    'Server schema mismatch while saving the rule. Please try again in a moment.',
                );
            }
            throw new InternalServerErrorException(msg || 'Failed to save the rule. Please try again.');
        }
    }

    async updateRule(
        id: string,
        data: {
            title?: string;
            description?: string;
            category?: string;
            photoUrl?: string | null;
            audience?: string[];
            authUserId?: string;
            authUserPhone?: string;
            authUserRole?: string;
        },
    ) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) {
            throw new BadRequestException(
                'Community context is required. Open your community workspace from the top switcher and try again.',
            );
        }

        await this.requireApartmentAdmin({
            authUserId: data.authUserId,
            authUserPhone: data.authUserPhone,
            authUserRole: data.authUserRole,
        });

        const existing = await (this.prisma.reader as any).rule.findFirst({ where: { id } });
        if (!existing) {
            throw new NotFoundException('Rule not found.');
        }

        const allowed = ['MEMBERS', 'RESIDENTS', 'STAFF'];
        const payload: any = {};
        if (typeof data.title === 'string') payload.title = data.title.trim();
        if (typeof data.description === 'string') payload.description = data.description.trim();
        if (typeof data.category === 'string') payload.category = data.category.trim();
        if (data.photoUrl === null || typeof data.photoUrl === 'string') payload.photoUrl = data.photoUrl;
        if (Array.isArray(data.audience)) {
            const filtered = Array.from(
                new Set(
                    data.audience
                        .map((a: any) => String(a || '').toUpperCase().trim())
                        .filter((a: string) => allowed.includes(a)),
                ),
            );
            if (filtered.length === 0) {
                throw new BadRequestException('At least one audience (Members, Residents, or Staff) is required.');
            }
            payload.audience = filtered;
        }

        try {
            return await (this.prisma.client as any).rule.update({ where: { id }, data: payload });
        } catch (err: any) {
            console.error('[updateRule] failed', { code: err?.code, msg: err?.message });
            throw new InternalServerErrorException(err?.message || 'Failed to update the rule.');
        }
    }

    async deleteRule(
        id: string,
        ctx: { authUserId?: string; authUserPhone?: string; authUserRole?: string },
    ) {
        const tenantId = PrismaService.als.getStore()?.tenantId;
        if (!tenantId) {
            throw new BadRequestException(
                'Community context is required. Open your community workspace from the top switcher and try again.',
            );
        }

        await this.requireApartmentAdmin(ctx);

        const existing = await (this.prisma.reader as any).rule.findFirst({ where: { id } });
        if (!existing) {
            throw new NotFoundException('Rule not found.');
        }

        try {
            return await (this.prisma.client as any).rule.delete({ where: { id } });
        } catch (err: any) {
            console.error('[deleteRule] failed', { code: err?.code, msg: err?.message });
            throw new InternalServerErrorException(err?.message || 'Failed to delete the rule.');
        }
    }

    async getSummaryStats() {
        const tenantId = PrismaService.als.getStore()?.tenantId || 'global';
        const cacheKey = `resido:stats:tenant:${tenantId}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (err: any) {
            console.warn('[getSummaryStats] Redis read failed:', err?.message);
        }

        const safe = async <T>(fn: () => Promise<T>, fallback: T, tag: string): Promise<T> => {
            try {
                return await fn();
            } catch (err: any) {
                console.warn(`[getSummaryStats] ${tag} failed:`, err?.message || err);
                return fallback;
            }
        };

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [
            totalMembers,
            totalFamilies,
            totalUnits,
            occupiedUnits,
            securityStaff,
            cleaningStaff,
            adminStaff,
            maintenanceStaff,
            billAggregates,
            pendingBillsByUnit,
            visitorsToday,
            openComplaints,
            progressComplaints,
            resolvedComplaints,
            gatepassesCreated,
            gatepassesApproved,
        ] = await Promise.all([
            safe(() => this.prisma.reader.member.count({ where: { role: 'RESIDENT' as any } }), 0, 'totalMembers'),
            safe(() => this.prisma.reader.family.count(), 0, 'totalFamilies'),
            safe(() => this.prisma.reader.unit.count(), 0, 'totalUnits'),
            safe(
                () => this.prisma.reader.unit.count({ where: { families: { some: {} } } }),
                0,
                'occupiedUnits',
            ),
            safe(() => this.prisma.reader.member.count({ where: { role: 'SECURITY_STAFF' as any } }), 0, 'security'),
            safe(() => this.prisma.reader.member.count({ where: { role: 'CLEANING_STAFF' as any } }), 0, 'cleaning'),
            safe(() => this.prisma.reader.member.count({ where: { role: 'ADMIN_STAFF' as any } }), 0, 'admin'),
            safe(
                () =>
                    this.prisma.reader.member.count({
                        where: { role: { in: ['MAINTENANCE_STAFF', 'STAFF'] as any } },
                    }),
                0,
                'maintenance',
            ),
            // Aggregate totals directly in the DB instead of reading all rows
            safe(
                () =>
                    this.prisma.reader.maintenanceBill.groupBy({
                        by: ['status'],
                        _sum: {
                            totalAmount: true,
                        },
                        _count: {
                            id: true,
                        },
                    }),
                [] as any[],
                'billAggregates',
            ),
            // Fetch top 5 pending units directly by DB sorting
            safe(
                () =>
                    this.prisma.reader.maintenanceBill.groupBy({
                        by: ['unitId'],
                        where: {
                            status: { not: 'PAID' },
                        },
                        _sum: {
                            totalAmount: true,
                        },
                        orderBy: {
                            _sum: {
                                totalAmount: 'desc',
                            },
                        },
                        take: 5,
                    }),
                [] as any[],
                'pendingBillsByUnit',
            ),
            safe(
                () => this.prisma.reader.visitor.count({ where: { createdAt: { gte: startOfDay } } }),
                0,
                'visitorsToday',
            ),
            // ComplaintStatus enum: OPEN | IN_PROGRESS | RESOLVED | CLOSED — there's no PENDING.
            safe(() => this.prisma.reader.complaint.count({ where: { status: 'OPEN' as any } }), 0, 'openComplaints'),
            safe(
                () => this.prisma.reader.complaint.count({ where: { status: 'IN_PROGRESS' as any } }),
                0,
                'progressComplaints',
            ),
            safe(
                () => this.prisma.reader.complaint.count({ where: { status: 'RESOLVED' as any } }),
                0,
                'resolvedComplaints',
            ),
            safe(() => this.prisma.reader.visitor.count(), 0, 'gatepassesCreated'),
            safe(
                () => this.prisma.reader.visitor.count({ where: { status: 'APPROVED' as any } }),
                0,
                'gatepassesApproved',
            ),
        ]);

        const emptyUnits = Math.max(0, totalUnits - occupiedUnits);
        const totalStaff = securityStaff + cleaningStaff + adminStaff + maintenanceStaff;

        let totalInvoiced = 0;
        let totalCollected = 0;
        let totalDues = 0;
        let unitsPaid = 0;
        let unitsDue = 0;

        billAggregates.forEach((group: any) => {
            const sum = Number(group._sum?.totalAmount) || 0;
            const count = Number(group._count?.id) || 0;
            totalInvoiced += sum;
            if (group.status === 'PAID') {
                totalCollected += sum;
                unitsPaid += count;
            } else {
                totalDues += sum;
                unitsDue += count;
            }
        });

        // Hydrate block/unit names for top pending dues
        let recentPendingDues: any[] = [];
        if (pendingBillsByUnit.length > 0) {
            const unitIds = pendingBillsByUnit.map((g: any) => g.unitId);
            const units = await safe(
                () =>
                    this.prisma.reader.unit.findMany({
                        where: { id: { in: unitIds } },
                        select: {
                            id: true,
                            number: true,
                            block: { select: { name: true } },
                        },
                    }),
                [] as any[],
                'pendingUnitsDetails',
            );
            const unitMap = new Map(units.map((u: any) => [u.id, u]));
            recentPendingDues = pendingBillsByUnit.map((g: any) => {
                const u = unitMap.get(g.unitId);
                const unitName = u ? `${u.block?.name || 'Block'} - ${u.number || 'Unit'}` : 'Unknown Unit';
                return {
                    unit: unitName,
                    amount: Number(g._sum?.totalAmount) || 0,
                };
            });
        }

        const result = {
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
                    MAINTENANCE: maintenanceStaff,
                },
            },
            finance: {
                totalInvoiced,
                totalCollected,
                totalDues,
                unitsPaid,
                unitsDue,
                recentPendingDues,
            },
            operations: {
                visitorsToday,
                activeComplaints: {
                    PENDING: openComplaints,
                    IN_PROGRESS: progressComplaints,
                    RESOLVED: resolvedComplaints,
                },
                gatepasses: {
                    totalCreated: gatepassesCreated,
                    totalApproved: gatepassesApproved,
                },
            },
        };

        try {
            await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30);
        } catch (err: any) {
            console.warn('[getSummaryStats] Redis write failed:', err?.message);
        }

        return result;
    }
}
