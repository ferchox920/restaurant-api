import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AddSaleTicketItemDto } from './add-sale-ticket-item.dto';
import { CancelSaleTicketDto } from './cancel-sale-ticket.dto';
import { ConfirmSaleTicketDto } from './confirm-sale-ticket.dto';
import { CreateSaleTicketDto } from './create-sale-ticket.dto';
import { SaleTicketQueryDto } from './sale-ticket-query.dto';
import { UpdateSaleTicketItemDto } from './update-sale-ticket-item.dto';
import { UpdateSaleTicketDto } from './update-sale-ticket.dto';
import { VoidSaleTicketDto } from './void-sale-ticket.dto';

describe('sale ticket DTOs', () => {
  it('accepts create sale ticket payload with valid salesChannelId', () => {
    const dto = plainToInstance(CreateSaleTicketDto, {
      salesChannelId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      notes: 'Mesa 4',
      paymentMethod: 'CASH',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects create sale ticket payload with invalid salesChannelId', () => {
    const dto = plainToInstance(CreateSaleTicketDto, {
      salesChannelId: 'invalid',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.isUuid).toBeDefined();
  });

  it('accepts add item payload with quantity greater than 0', () => {
    const dto = plainToInstance(AddSaleTicketItemDto, {
      productId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      quantity: 1.5,
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects add item payload with quantity 0', () => {
    const dto = plainToInstance(AddSaleTicketItemDto, {
      productId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      quantity: 0,
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });

  it('rejects update item payload with quantity 0', () => {
    const dto = plainToInstance(UpdateSaleTicketItemDto, {
      quantity: 0,
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.min).toBeDefined();
  });

  it('rejects cancel payload without reason', () => {
    const dto = plainToInstance(CancelSaleTicketDto, {
      reason: '',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.isNotEmpty).toBeDefined();
  });

  it('accepts empty confirm payload', () => {
    const dto = plainToInstance(ConfirmSaleTicketDto, {});

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepts confirm payload with transfer payment method and bank', () => {
    const dto = plainToInstance(ConfirmSaleTicketDto, {
      paymentMethod: 'TRANSFER',
      paymentBankId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects update payload with invalid paymentBankId', () => {
    const dto = plainToInstance(UpdateSaleTicketDto, {
      paymentMethod: 'TRANSFER',
      paymentBankId: 'invalid',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.isUuid).toBeDefined();
  });

  it('accepts void payload with valid reason', () => {
    const dto = plainToInstance(VoidSaleTicketDto, {
      reason: 'Error de carga',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects void payload with too short reason', () => {
    const dto = plainToInstance(VoidSaleTicketDto, {
      reason: 'no',
    });

    const errors = validateSync(dto);

    expect(errors[0]?.constraints?.minLength).toBeDefined();
  });

  it('accepts query payload with valid filters', () => {
    const dto = plainToInstance(SaleTicketQueryDto, {
      status: 'DRAFT',
      salesChannelId: '0f91a8fe-0e06-4f9c-8e8d-18a4f4d0a2b4',
      from: '2026-06-09T00:00:00.000Z',
      to: '2026-06-10T00:00:00.000Z',
      createdById: 'c690b6a5-5bec-4b85-98a6-3e5f8318dd29',
      search: '1001',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });
});
