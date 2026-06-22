import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'ID token JWT retornado pelo Google Sign-In' })
  @IsString()
  @MinLength(20)
  idToken: string;

  @ApiPropertyOptional({ description: 'Obrigatório ao criar conta nova (registro)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  acceptTerms?: boolean;
}
