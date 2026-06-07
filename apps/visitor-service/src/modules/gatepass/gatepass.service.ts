import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GatepassStatus } from '@resido/visitor-client';

@Injectable()
export class GatepassService {
  constructor(private prisma: PrismaService) {}

  async createGatepass(tenantId: string, data: any) {
    const { tenantId: _ignored, ...rest } = data || {};
    return this.prisma.gatepass.create({
      data: {
        ...rest,
        tenantId,
        status: GatepassStatus.PENDING,
      },
    });
  }

  async getGatepasses(tenantId: string, residentId: string) {
    return this.prisma.reader.gatepass.findMany({
      where: { tenantId, residentId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getGatepassById(tenantId: string, id: string) {
    const gatepass = await this.prisma.reader.gatepass.findFirst({
      where: { id, tenantId },
    });
    if (!gatepass) throw new NotFoundException('Gatepass not found');
    return gatepass;
  }

  async approveGatepass(tenantId: string, id: string, securityMemberId: string) {
    const gatepass = await this.prisma.gatepass.findFirst({
      where: { id, tenantId },
    });
    if (!gatepass) throw new NotFoundException('Gatepass not found');

    const updated = await this.prisma.gatepass.update({
      where: { id },
      data: {
        status: GatepassStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: securityMemberId,
      },
    });

    await this.prisma.visitorEntry.create({
      data: {
        tenantId,
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
