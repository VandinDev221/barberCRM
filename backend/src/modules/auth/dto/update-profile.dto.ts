import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '11999998888', description: 'WhatsApp do barbeiro para receber avisos' })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Informe DDD + número com pelo menos 10 dígitos' })
  @Matches(/^[\d\s()+-]+$/, { message: 'Telefone inválido' })
  phone?: string;
}
