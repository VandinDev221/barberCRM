import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, Equals } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Aceite dos Termos de Uso e Política de Privacidade' })
  @IsBoolean()
  @Equals(true, { message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.' })
  acceptTerms: boolean;
}
