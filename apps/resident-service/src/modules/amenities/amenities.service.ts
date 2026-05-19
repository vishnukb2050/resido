import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class AmenitiesService {
  constructor(private prisma: PrismaService) {}

  async createAmenity(tenantId: string, data: any) {
    return this.prisma.client.amenity.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async getAmenities(tenantId: string) {
    const amenities = await this.prisma.client.amenity.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(amenities.map(a => this.getAmenityById(a.id, tenantId)));
  }

  async getAmenityById(id: string, tenantId: string, date?: string) {
    const amenity = await this.prisma.client.amenity.findFirst({
      where: { id, tenantId },
    });
    if (!amenity) throw new NotFoundException('Amenity not found');

    let resolvedSlots = amenity.timeSlots;
    let resolvedDates = amenity.availableDates;

    if (amenity.scheduleType && amenity.scheduleConfig) {
      try {
        const config = JSON.parse(amenity.scheduleConfig);
        const today = new Date();
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        if (amenity.scheduleType === 'WEEKLY') {
          const dates: string[] = [];
          for (let i = 0; i < 90; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = weekdays[d.getDay()];
            if (config[dayName] && config[dayName].length > 0) {
              dates.push(dateStr);
            }
          }
          resolvedDates = dates;

          if (date) {
            const d = new Date(date);
            const dayName = weekdays[d.getDay()];
            resolvedSlots = config[dayName] || [];
          } else {
            const allSlots = new Set<string>();
            Object.values(config).forEach((slots: any) => {
              if (Array.isArray(slots)) slots.forEach(s => allSlots.add(s));
            });
            resolvedSlots = Array.from(allSlots);
          }
        } 
        
        else if (amenity.scheduleType === 'MONTHLY') {
          const dates: string[] = [];
          const allowedDays = config.daysOfMonth || [];
          for (let i = 0; i < 90; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            if (allowedDays.includes(d.getDate())) {
              dates.push(dateStr);
            }
          }
          resolvedDates = dates;

          if (date) {
            const d = new Date(date);
            if (allowedDays.includes(d.getDate())) {
              resolvedSlots = config.slots || [];
            } else {
              resolvedSlots = [];
            }
          } else {
            resolvedSlots = config.slots || [];
          }
        } 
        
        else if (amenity.scheduleType === 'CUSTOM') {
          resolvedDates = Object.keys(config.dates || {});
          if (date) {
            resolvedSlots = config.dates?.[date] || [];
          } else {
            const allSlots = new Set<string>();
            Object.values(config.dates || {}).forEach((slots: any) => {
              if (Array.isArray(slots)) slots.forEach(s => allSlots.add(s));
            });
            resolvedSlots = Array.from(allSlots);
          }
        }
      } catch (err) {
        console.error('Failed to parse scheduleConfig:', err);
      }
    }

    return {
      ...amenity,
      timeSlots: resolvedSlots,
      availableDates: resolvedDates,
    };
  }

  async updateAmenity(id: string, tenantId: string, data: any) {
    const amenity = await this.getAmenityById(id, tenantId);
    return this.prisma.client.amenity.update({
      where: { id: amenity.id },
      data,
    });
  }

  async deleteAmenity(id: string, tenantId: string) {
    const amenity = await this.getAmenityById(id, tenantId);
    return this.prisma.client.amenity.delete({
      where: { id: amenity.id },
    });
  }

  // Bookings logic
  async createBooking(tenantId: string, userId: string, amenityId: string, data: any) {
    const member = await this.prisma.client.member.findFirst({
      where: { userId, tenantId }
    });
    if (!member) throw new Error('Resident profile not found in this community.');
    const actualMemberId = member.id;

    const amenity = await this.getAmenityById(amenityId, tenantId, data.bookingDate);
    const requestedPersons = data.persons || 1;
    const isRecurring = data.isRecurring || false;
    const recurringPeriod = data.recurringPeriod || null;

    const performSingleBooking = async (bookingDate: string, timeSlot: string, parentBookingId?: string) => {
      const existingBookings = await this.prisma.client.amenityBooking.findMany({
        where: {
          tenantId,
          amenityId,
          bookingDate,
          timeSlot,
          status: 'CONFIRMED'
        }
      });

      if (existingBookings.length > 0) {
        throw new Error(`Time slot (${timeSlot}) on ${bookingDate} is already booked.`);
      }

      return this.prisma.client.amenityBooking.create({
        data: {
          tenantId,
          amenityId,
          memberId: actualMemberId,
          bookingDate,
          timeSlot,
          persons: requestedPersons,
          status: 'CONFIRMED',
          isRecurring,
          recurringPeriod,
          parentBookingId,
        },
      });
    };

    const primaryBooking = await performSingleBooking(data.bookingDate, data.timeSlot);

    if (isRecurring && recurringPeriod) {
      let currentDate = new Date(data.bookingDate);
      for (let i = 1; i <= 3; i++) {
        if (recurringPeriod === 'WEEKLY') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurringPeriod === 'MONTHLY') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        const nextDateStr = currentDate.toISOString().split('T')[0];
        try {
          await performSingleBooking(nextDateStr, data.timeSlot, primaryBooking.id);
        } catch (e: any) {
          console.warn(`Could not schedule recurring occurrence ${i} on ${nextDateStr}:`, e.message);
        }
      }
    }

    return primaryBooking;
  }

  async getAmenityBookings(tenantId: string, amenityId: string, date: string) {
    return this.prisma.client.amenityBooking.findMany({
      where: {
        tenantId,
        amenityId,
        bookingDate: date,
        status: 'CONFIRMED'
      },
      include: {
        member: {
          select: { name: true }
        }
      }
    });
  }

  async getMyBookings(tenantId: string, userId: string) {
    const member = await this.prisma.client.member.findFirst({
      where: { userId, tenantId }
    });
    if (!member) return [];

    return this.prisma.client.amenityBooking.findMany({
      where: { tenantId, memberId: member.id },
      include: { amenity: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
