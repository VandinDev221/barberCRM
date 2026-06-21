import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'ID token JWT retornado pelo Google Sign-In' })
  @IsString()
  @MinLength(20)
  idToken: string;

  @ApiPropertyOptional({ description: 'Obrigatório ao criar conta nova (registro)' })
  @IsOptional()
  @IsBoolean()
  acceptTerms?: boolean;
}
