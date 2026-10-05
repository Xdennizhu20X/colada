export type DeliveryType = 'local' | 'domicilio';
export type PaymentStatus = 'pendiente' | 'pagado';
export type PaymentMethod = 'efectivo' | 'transferencia';
export type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'vendedor';
  pin?: string;
}

export interface Order {
  id: string;
  client_name: string;
  client_phone?: string;
  half_liters: number; // $2.00 c/u
  liters: number;      // $3.00 c/u
  breads: number;      // $0.50 c/u
  total_liters: number;
  total_price: number;
  delivery_type: DeliveryType;
  delivery_address?: string;
  delivery_reference?: string;
  notes?: string;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  order_status: OrderStatus;
  created_by_id: string;
  created_by_name: string;
  created_at: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  totalLiters: number;
  totalHalfLitersCount: number;
  totalLitersCount: number;
  totalBreadsCount: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  localOrders: number;
  deliveryOrders: number;
  sellerBreakdown: {
    sellerName: string;
    orderCount: number;
    totalAmount: number;
    liters: number;
    breads: number;
  }[];
}
