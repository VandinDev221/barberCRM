import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class AppointmentServiceItemDto {
  @ApiProperty()
  serviceId: string;
  @ApiProperty()
  price: number;
}

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [AppointmentServiceItemDto] })
  @IsArray()
  serviceItems: AppointmentServiceItemDto[];
}
