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
  sale_number?: number; // 1 = Primera Venta, 2 = Segunda Venta, etc.
  client_name: string;
  client_phone?: string;
  half_liters: number; // $2.00 c/u
  liters: number;      // $3.00 c/u
  breads: number;      // $0.50 c/u
  combos?: number;     // $1.50 c/u (1 vaso de colada + 1 puerca)
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
  totalCombosCount: number;
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
    combos?: number;
  }[];
}

export interface SaleBatch {
  id: string;
  sale_number: number;
  name: string; // Ej: "Primera Venta", "Segunda Venta"
  status: 'activa' | 'cerrada';
  created_at: string;
  closed_at?: string;
  total_revenue?: number;
  total_liters?: number;
  total_breads?: number;
  total_orders?: number;
}

