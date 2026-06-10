import { Allow } from 'class-validator';

export class ConfirmSaleTicketDto {
  @Allow()
  _empty?: boolean;
}
