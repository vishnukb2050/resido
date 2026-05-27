import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpsertAttendanceConfigDto {
    @Type(() => Number)
    @IsNumber()
    latitude: number;

    @Type(() => Number)
    @IsNumber()
    longitude: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(50)
    radiusMeters?: number;

    @IsOptional()
    @IsString()
    address?: string;
}
