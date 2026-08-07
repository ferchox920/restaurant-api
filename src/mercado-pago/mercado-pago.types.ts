export type MercadoPagoPaymentResource = {
  id: string | number;
  transaction_amount: number | string;
  transaction_amount_refunded?: number | string | null;
  currency_id: string;
  status: string;
  status_detail?: string | null;
  payment_method_id?: string | null;
  payment_type_id?: string | null;
  installments?: number | null;
  external_reference?: string | null;
  description?: string | null;
  live_mode: boolean;
  date_created: string;
  date_approved?: string | null;
  date_last_updated: string;
  transaction_details?: {
    net_received_amount?: number | string | null;
  } | null;
};

export type MercadoPagoPaymentsPage = {
  paging: {
    total: number;
    limit: number;
    offset: number;
  };
  results: MercadoPagoPaymentResource[];
};

export type MercadoPagoOrderItem = {
  title: string;
  description: string;
  unit_price: string;
  quantity: number;
  external_code: string;
};

export type MercadoPagoOrderCreatePayload = {
  type: 'online';
  processing_mode: 'automatic';
  capture_mode: 'automatic';
  external_reference: string;
  description: string;
  total_amount: string;
  currency: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type: string; number: string };
  };
  transactions: {
    payments: Array<{
      amount: string;
      payment_method: {
        id: string;
        type: string;
        token: string;
        installments: number;
        statement_descriptor?: string;
      };
    }>;
  };
  items: MercadoPagoOrderItem[];
};

export type MercadoPagoOrderPaymentResource = {
  id?: string;
  amount?: string | number;
  paid_amount?: string | number;
  status?: string;
  status_detail?: string;
  payment_method?: {
    id?: string;
    type?: string;
    installments?: number;
    ticket_url?: string;
  };
};

export type MercadoPagoOrderResource = {
  id: string;
  type: string;
  processing_mode?: string;
  external_reference?: string;
  total_amount: string | number;
  total_paid_amount?: string | number;
  currency?: string;
  status: string;
  status_detail?: string;
  created_date?: string;
  last_updated_date?: string;
  checkout_url?: string;
  transactions?: {
    payments?: MercadoPagoOrderPaymentResource[];
  };
};
