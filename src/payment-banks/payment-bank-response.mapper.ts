import { PaymentBankResponseDto } from './dto/payment-bank-response.dto';

export function toPaymentBankResponse(paymentBank: {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PaymentBankResponseDto {
  return {
    id: paymentBank.id,
    name: paymentBank.name,
    description: paymentBank.description,
    active: paymentBank.active,
    createdById: paymentBank.createdById,
    createdAt: paymentBank.createdAt,
    updatedAt: paymentBank.updatedAt,
  };
}
