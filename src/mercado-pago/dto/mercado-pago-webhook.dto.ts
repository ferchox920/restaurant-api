import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MercadoPagoWebhookDataDto {
  @IsString()
  @MaxLength(150)
  id!: string;
}

export class MercadoPagoWebhookDto {
  @IsString()
  @MaxLength(100)
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  api_version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  application_id?: string;

  @IsOptional()
  @IsISO8601()
  date_created?: string;

  @IsOptional()
  id?: string | number;

  @IsBoolean()
  live_mode!: boolean;

  @IsString()
  @MaxLength(30)
  type!: string;

  @IsOptional()
  user_id?: string | number;

  @IsObject()
  @ValidateNested()
  @Type(() => MercadoPagoWebhookDataDto)
  data!: MercadoPagoWebhookDataDto;
}
