import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsEmail, MinLength } from 'class-validator';

export class PublicBookingDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '11999999999' })
  @IsString()
  @MinLength(8)
  phone: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '2025-03-10' })
  @IsString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  time: string;

  @ApiProperty({ example: ['serviceId1', 'serviceId2'], description: 'IDs dos serviços' })
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];
}
