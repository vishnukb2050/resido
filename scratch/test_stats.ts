import { PrismaClient } from '@resido/resident-client';

async function test() {
    const prisma = new PrismaClient({
        datasources: { db: { url: "postgresql://postgres:Vx2mj6rd3@database-1.cr0qoaway7on.ap-south-1.rds.amazonaws.com:5432/resido_core?schema=public" } }
    });

    try {
        console.log("Testing resident count...");
        const totalMembers = await prisma.member.count({
            where: { role: 'RESIDENT' as any }
        });
        console.log("totalMembers:", totalMembers);

        console.log("Testing family count...");
        const totalFamilies = await prisma.family.count();
        console.log("totalFamilies:", totalFamilies);

        console.log("Testing unit count...");
        const totalUnits = await prisma.unit.count();
        console.log("totalUnits:", totalUnits);

        console.log("Testing occupied units count...");
        const occupiedUnits = await prisma.unit.count({
            where: { families: { some: {} } }
        });
        console.log("occupiedUnits:", occupiedUnits);

        console.log("Testing staff role counts...");
        const securityStaff = await prisma.member.count({ where: { role: 'SECURITY_STAFF' as any } });
        const cleaningStaff = await prisma.member.count({ where: { role: 'CLEANING_STAFF' as any } });
        const adminStaff = await prisma.member.count({ where: { role: 'ADMIN_STAFF' as any } });
        const maintenanceStaff = await prisma.member.count({
            where: { role: { in: ['MAINTENANCE_STAFF', 'STAFF'] as any } }
        });
        console.log("securityStaff:", securityStaff, "cleaningStaff:", cleaningStaff, "adminStaff:", adminStaff, "maintenanceStaff:", maintenanceStaff);

        console.log("Testing maintenanceBill query...");
        const allBills = await prisma.maintenanceBill.findMany({
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
        console.log("allBills count:", allBills.length);

        console.log("Testing visitor count...");
        const visitorsToday = await prisma.visitor.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }
        });
        console.log("visitorsToday:", visitorsToday);

        console.log("Testing complaints count...");
        const pendingComplaints = await prisma.complaint.count({ where: { status: 'PENDING' as any } });
        console.log("pendingComplaints:", pendingComplaints);

        console.log("Testing gatepass counts...");
        const gatepassesCreated = await prisma.visitor.count();
        const gatepassesApproved = await prisma.visitor.count({ where: { status: 'APPROVED' as any } });
        console.log("gatepassesCreated:", gatepassesCreated, "gatepassesApproved:", gatepassesApproved);

        console.log("All queries executed successfully!");
    } catch (err) {
        console.error("Error executing queries:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
