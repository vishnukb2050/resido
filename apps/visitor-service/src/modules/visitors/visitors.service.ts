import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async getVisitorRegister(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    category?: string,
    skip = 0,
    take = 0,
  ) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.inTime = {};
      if (startDate) where.inTime.gte = new Date(startDate);
      if (endDate) where.inTime.lte = new Date(endDate);
    }
    if (category) {
      where.category = category;
    }

    const safeTake = Math.min(take > 0 ? take : 200, 500);
    const safeSkip = Math.max(skip, 0);

    return this.prisma.reader.visitorEntry.findMany({
      where,
      orderBy: { inTime: 'desc' },
      skip: safeSkip,
      take: safeTake,
    });
  }

  async createEntry(tenantId: string, data: any) {
    const { tenantId: _ignored, ...rest } = data || {};
    return this.prisma.visitorEntry.create({
      data: { ...rest, tenantId },
    });
  }

  async checkout(tenantId: string, id: string) {
    const entry = await this.prisma.reader.visitorEntry.findFirst({
      where: { id, tenantId },
    });
    if (!entry) {
      throw new NotFoundException('Visitor entry not found');
    }
    return this.prisma.visitorEntry.update({
      where: { id },
      data: { outTime: new Date() },
    });
  }
}
