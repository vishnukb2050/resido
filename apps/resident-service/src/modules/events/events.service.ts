import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';
import { EventVisibility } from '@resido/core-client';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, createdBy: string) {
    return this.prisma.client.event.create({
      data: {
        ...data,
        createdBy,
      },
    });
  }

  async findAll(memberId: string, tenantId: string) {
    // Fetch events based on visibility:
    // 1. COMMUNITY (all in tenant)
    // 2. PRIVATE (only createdBy === memberId)
    // 3. GROUPS (if member is in sharedWithIds)
    // 4. CONTACTS (if member is in sharedWithIds)
    
    return this.prisma.client.event.findMany({
      where: {
        OR: [
          { visibility: 'COMMUNITY' },
          { createdBy: memberId },
          { 
            AND: [
              { visibility: { in: ['GROUPS', 'CONTACTS'] } },
              { sharedWithIds: { has: memberId } }
            ]
          }
        ]
      },
      orderBy: { startDate: 'asc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.client.event.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.client.event.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.client.event.delete({
      where: { id },
    });
  }
}
