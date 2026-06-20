import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'seu@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'sua-senha-segura' })
  @IsString()
  @MinLength(6)
  password: string;
}
