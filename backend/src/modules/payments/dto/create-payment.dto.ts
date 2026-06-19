import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: ['pix', 'cash', 'card'] })
  @IsEnum(['pix', 'cash', 'card'])
  method: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  paidAt?: string; // ISO date
}
