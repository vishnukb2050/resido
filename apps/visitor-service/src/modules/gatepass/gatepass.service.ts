import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GatepassStatus } from '@resido/visitor-client';

@Injectable()
export class GatepassService {
  constructor(private prisma: PrismaService) {}

  async createGatepass(data: any) {
    return this.prisma.gatepass.create({
      data: {
        ...data,
        status: GatepassStatus.PENDING,
      },
    });
  }

  async getGatepasses(residentId: string) {
    return this.prisma.gatepass.findMany({
      where: { residentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGatepassById(id: string) {
    const gatepass = await this.prisma.gatepass.findUnique({ where: { id } });
    if (!gatepass) throw new NotFoundException('Gatepass not found');
    return gatepass;
  }

  async approveGatepass(id: string, securityMemberId: string) {
    const gatepass = await this.prisma.gatepass.findUnique({ where: { id } });
    if (!gatepass) throw new NotFoundException('Gatepass not found');

    const updated = await this.prisma.gatepass.update({
      where: { id },
      data: {
        status: GatepassStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: securityMemberId,
      },
    });

    // Create a visitor entry automatically
    await this.prisma.visitorEntry.create({
      data: {
        visitorName: gatepass.visitorName,
        phone: gatepass.phone,
        purpose: gatepass.purpose,
        category: 'Visitor',
        unitToVisit: gatepass.residentUnit || 'N/A',
        vehicleNumber: gatepass.vehicleNumber,
        gatepassId: gatepass.id,
        loggedBy: securityMemberId,
      },
    });

    return updated;
  }
}
