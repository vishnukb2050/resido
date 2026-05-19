import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AmenitiesService {
  constructor(private prisma: PrismaService) {}

  async createAmenity(tenantId: string, data: any) {
    return this.prisma.amenity.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getAmenities(tenantId: string) {
    return this.prisma.amenity.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAmenityById(id: string, tenantId: string) {
    const amenity = await this.prisma.amenity.findFirst({
      where: { id, tenantId },
    });
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }

  async updateAmenity(id: string, tenantId: string, data: any) {
    const amenity = await this.getAmenityById(id, tenantId);
    return this.prisma.amenity.update({
      where: { id: amenity.id },
      data,
    });
  }

  async deleteAmenity(id: string, tenantId: string) {
    const amenity = await this.getAmenityById(id, tenantId);
    return this.prisma.amenity.delete({
      where: { id: amenity.id },
    });
  }

  // Bookings logic
  async createBooking(tenantId: string, memberId: string, amenityId: string, data: any) {
    const amenity = await this.getAmenityById(amenityId, tenantId);
    
    // Check if slot is full (basic logic: count current bookings for this slot)
    const existingBookings = await this.prisma.amenityBooking.findMany({
      where: {
        tenantId,
        amenityId,
        bookingDate: data.bookingDate,
        timeSlot: data.timeSlot,
        status: 'CONFIRMED'
      }
    });

    const totalPersons = existingBookings.reduce((sum: number, b: any) => sum + b.persons, 0);
    const requestedPersons = data.persons || 1;

    if (totalPersons + requestedPersons > amenity.maxPersons) {
      throw new Error(`Time slot is fully booked or exceeds max persons allowed (${amenity.maxPersons})`);
    }

    return this.prisma.amenityBooking.create({
      data: {
        tenantId,
        amenityId,
        memberId,
        bookingDate: data.bookingDate,
        timeSlot: data.timeSlot,
        persons: requestedPersons,
        status: 'CONFIRMED',
      },
    });
  }

  async getAmenityBookings(tenantId: string, amenityId: string, date: string) {
    return this.prisma.amenityBooking.findMany({
      where: {
        tenantId,
        amenityId,
        bookingDate: date,
        status: 'CONFIRMED'
      },
      include: {
        member: {
          select: { name: true, unitId: true } // Assuming member has name and unitId
        }
      }
    });
  }

  async getMyBookings(tenantId: string, memberId: string) {
    return this.prisma.amenityBooking.findMany({
      where: { tenantId, memberId },
      include: { amenity: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
