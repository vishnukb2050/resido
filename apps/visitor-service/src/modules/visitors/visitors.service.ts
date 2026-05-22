import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async getVisitorRegister(startDate?: string, endDate?: string, category?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.inTime = {};
      if (startDate) where.inTime.gte = new Date(startDate);
      if (endDate) where.inTime.lte = new Date(endDate);
    }
    if (category) {
      where.category = category;
    }

    return this.prisma.visitorEntry.findMany({
      where,
      orderBy: { inTime: 'desc' },
    });
  }

  async createEntry(data: any) {
    return this.prisma.visitorEntry.create({ data });
  }

  async checkout(id: string) {
    return this.prisma.visitorEntry.update({
      where: { id },
      data: { outTime: new Date() },
    });
  }
}
