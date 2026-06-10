import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

@ValidatorConstraint({ name: 'reportDateRange', async: false })
class ReportDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: Date | undefined, args: ValidationArguments): boolean {
    const object = args.object as ReportDateRangeQueryDto;
    if (!object.from || !value) {
      return true;
    }

    return object.from.getTime() <= value.getTime();
  }

  defaultMessage(): string {
    return '"from" cannot be greater than "to".';
  }
}

export class ReportDateRangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-01T00:00:00.000Z',
    description: 'Fecha/hora ISO inicial inclusive.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    example: '2026-06-10T23:59:59.999Z',
    description: 'Fecha/hora ISO final inclusive.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @Validate(ReportDateRangeConstraint)
  to?: Date;
}
