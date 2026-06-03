import { IsString, IsNumber, IsOptional, IsIn, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCommunityTransactionDto {
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    amount: number;

    @IsIn(['INCOME', 'EXPENSE'])
    type: 'INCOME' | 'EXPENSE';

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    date?: string;

    @IsOptional()
    @IsIn(['CASH', 'UPI', 'BANK', 'CHEQUE', 'OTHER'])
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    billUrl?: string;
}

export class UpdateMaintenanceConfigDto {
    @IsOptional()
    @IsString()
    billingCycle?: string;

    @IsOptional()
    @IsString()
    calculationType?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    flatRateAmount?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    ratePerSqFt?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(28)
    dueDateDay?: number;

    @IsOptional()
    @IsString()
    penaltyType?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    penaltyAmount?: number;
}

export class GenerateBillsDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @Type(() => Number)
    @IsInt()
    @Min(2000)
    year: number;
}
