import { ConflictException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { SaleTicketResponseDto } from '../sales/dto/sale-ticket-response.dto';
import { SaleTicketStatus } from '../sales/sales.enums';
import { SalesService } from '../sales/sales.service';
import { MercadoPagoOrderPreviewResponseDto } from './dto/mercado-pago-order-preview-response.dto';

@Injectable()
export class MercadoPagoOrderPreviewService {
  constructor(private readonly salesService: SalesService) {}

  async preview(ticketId: string): Promise<MercadoPagoOrderPreviewResponseDto> {
    const ticket = await this.salesService.findOne(ticketId);
    this.validateTicket(ticket);

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      payload: {
        type: 'online',
        processing_mode: 'automatic',
        external_reference: ticket.id,
        description: `Ticket #${ticket.ticketNumber}`,
        total_amount: this.formatAmount(ticket.total),
        items: ticket.items.map((item) => ({
          title: item.productNameSnapshot,
          description: item.productNameSnapshot,
          unit_price: this.formatAmount(item.unitPriceSnapshot),
          quantity: new Decimal(item.quantity).toNumber(),
          external_code: item.productSkuSnapshot?.trim() || item.productId,
        })),
      },
    };
  }

  private validateTicket(ticket: SaleTicketResponseDto): void {
    if (ticket.status !== SaleTicketStatus.DRAFT) {
      throw new ConflictException(
        'Only DRAFT sale tickets can be previewed for Mercado Pago.',
      );
    }

    if (ticket.items.length === 0) {
      throw new ConflictException(
        'The sale ticket must contain at least one item.',
      );
    }

    const total = new Decimal(ticket.total);
    if (!total.greaterThan(0)) {
      throw new ConflictException('The sale ticket total must be positive.');
    }

    if (
      !new Decimal(ticket.discountTotal).isZero() ||
      !new Decimal(ticket.commissionTotal).isZero()
    ) {
      throw new ConflictException(
        'Discounts and commissions are not supported in Mercado Pago order previews yet.',
      );
    }

    const itemsTotal = ticket.items.reduce(
      (sum, item) => sum.add(new Decimal(item.subtotal)),
      new Decimal(0),
    );
    if (!itemsTotal.equals(total)) {
      throw new ConflictException(
        'The sale ticket total does not match the sum of its items.',
      );
    }
  }

  private formatAmount(value: string): string {
    return new Decimal(value).toFixed(2);
  }
}
