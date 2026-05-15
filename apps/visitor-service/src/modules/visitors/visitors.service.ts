import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitorsService {
  constructor(private prisma: PrismaService) {}

  async getVisitorRegister() {
    return this.prisma.visitorEntry.findMany({
      orderBy: { inTime: 'desc' },
    });
  }

  async createEntry(data: any) {
    return this.prisma.visitorEntry.create({ data });
  }
}
