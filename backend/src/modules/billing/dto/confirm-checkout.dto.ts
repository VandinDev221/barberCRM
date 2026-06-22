import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmCheckoutDto {
  @ApiProperty({ example: 'cs_live_...' })
  @IsString()
  @MinLength(8)
  sessionId: string;
}
