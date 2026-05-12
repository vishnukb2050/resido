import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/tenant-prisma.service';

@Injectable()
export class FinanceService {
    constructor(private prisma: PrismaService) {}

    async getOverview(memberId: string, tenantId: string, month: number, year: number) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const transactions = await this.prisma.client.financeTransaction.findMany({
            where: {
                memberId,
                tenantId,
                date: { gte: startOfMonth, lte: endOfMonth }
            }
        });

        const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
        const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
        const savings = income - expenses;

        return { income, expenses, savings, recentTransactions: transactions.slice(0, 5) };
    }

    async addTransaction(memberId: string, tenantId: string, data: any) {
        return this.prisma.client.financeTransaction.create({
            data: {
                ...data,
                memberId,
                tenantId,
                date: new Date(data.date)
            }
        });
    }

    async getTransactions(memberId: string, tenantId: string, filters: any) {
        const { type, month, year } = filters;
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        return this.prisma.client.financeTransaction.findMany({
            where: {
                memberId,
                tenantId,
                type: type === 'ALL' ? undefined : type,
                date: { gte: startOfMonth, lte: endOfMonth }
            },
            include: { category: true },
            orderBy: { date: 'desc' }
        });
    }

    async getBudgets(memberId: string, tenantId: string, month: number, year: number) {
        const budgets = await this.prisma.client.financeBudget.findMany({
            where: { memberId, tenantId, month, year },
            include: { category: true }
        });

        // For each budget, calculate current spending
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const spending = await this.prisma.client.financeTransaction.groupBy({
            by: ['categoryId'],
            where: {
                memberId,
                tenantId,
                type: 'EXPENSE',
                date: { gte: startOfMonth, lte: endOfMonth }
            },
            _sum: { amount: true }
        });

        return budgets.map(b => ({
            ...b,
            spent: spending.find(s => s.categoryId === b.categoryId)?._sum.amount || 0
        }));
    }

    async createBudget(memberId: string, tenantId: string, data: any) {
        return this.prisma.client.financeBudget.upsert({
            where: {
                memberId_categoryId_month_year: {
                    memberId,
                    categoryId: data.categoryId,
                    month: data.month,
                    year: data.year
                }
            },
            update: { amount: data.amount },
            create: { ...data, memberId, tenantId }
        });
    }

    async getCategoryBreakdown(memberId: string, tenantId: string, month: number, year: number) {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0);

        const results = await this.prisma.client.financeTransaction.groupBy({
            by: ['categoryId'],
            where: {
                memberId,
                tenantId,
                type: 'EXPENSE',
                date: { gte: startOfMonth, lte: endOfMonth }
            },
            _sum: { amount: true }
        });

        const categories = await this.prisma.client.financeCategory.findMany({
            where: { id: { in: results.map(r => r.categoryId) } }
        });

        return results.map(r => ({
            categoryId: r.categoryId,
            category: categories.find(c => c.id === r.categoryId),
            amount: r._sum.amount
        }));
    }
}
