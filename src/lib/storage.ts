import { Order, UserProfile, SalesMetrics } from '@/types';
import { INITIAL_USERS } from './constants';
import { supabase, isSupabaseConfigured } from './supabase';

const ORDERS_KEY = 'colada_orders_v3';
const USERS_KEY = 'colada_users_v3';

// Datos de prueba iniciales si está vacío
const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-demo-1',
    client_name: 'Dra. Gabriela Paredes',
    client_phone: '0991234567',
    half_liters: 1,
    liters: 1,
    breads: 4,
    total_liters: 1.5,
    total_price: 7.00,
    delivery_type: 'local',
    payment_status: 'pagado',
    payment_method: 'efectivo',
    order_status: 'listo',
    created_by_id: 'usr-dennis',
    created_by_name: 'Dennis',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

export const deduplicateOrders = (orders: Order[]): Order[] => {
  const map = new Map<string, Order>();
  orders.forEach((o) => {
    if (o && o.id) {
      map.set(o.id, o);
    }
  });
  return Array.from(map.values());
};

// Carga de usuarios (soporta Supabase con fallback a LocalStorage)
export const getStoredUsers = async (): Promise<UserProfile[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('app_users').select('*');
      if (!error && data && data.length > 0) {
        return data as UserProfile[];
      }
      if (!error && data && data.length === 0) {
        await supabase.from('app_users').insert(INITIAL_USERS);
        return INITIAL_USERS;
      }
    } catch (e) {
      console.error('Error consultando usuarios en Supabase:', e);
    }
  }

  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
};

export const saveUser = async (user: UserProfile): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('app_users').upsert(user);
    } catch (e) {
      console.error('Error guardando usuario en Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USERS_KEY);
    const list: UserProfile[] = raw ? JSON.parse(raw) : INITIAL_USERS;
    const updated = [...list.filter((u) => u.id !== user.id), user];
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  }
};

export const deleteUserFromStorage = async (userId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('app_users').delete().eq('id', userId);
    } catch (e) {
      console.error('Error eliminando usuario en Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USERS_KEY);
    const list: UserProfile[] = raw ? JSON.parse(raw) : INITIAL_USERS;
    const updated = list.filter((u) => u.id !== userId);
    localStorage.setItem(USERS_KEY, JSON.stringify(updated));
  }
};

// Pedidos
export const getOrders = async (): Promise<Order[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al consultar Supabase:', error);
      } else if (data) {
        return deduplicateOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Excepción con Supabase, usando almacenamiento local:', err);
    }
  }

  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(DEMO_ORDERS));
      return DEMO_ORDERS;
    }
    const parsed: Order[] = JSON.parse(raw);
    return deduplicateOrders(parsed);
  } catch {
    return [];
  }
};

export const saveOrder = async (order: Order): Promise<Order> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();

      if (error) {
        console.error('Error guardando en Supabase:', error);
      } else if (data) {
        return data as Order;
      }
    } catch (err) {
      console.error('Excepción guardando pedido en Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await getOrders();
    const filtered = current.filter((o) => o.id !== order.id);
    const updated = [order, ...filtered];
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('colada_orders_updated'));
  }

  return order;
};

export const updateOrderStatus = async (
  orderId: string,
  status: Order['order_status'],
  paymentStatus?: Order['payment_status']
): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const updateData: Partial<Order> = { order_status: status };
      if (paymentStatus) updateData.payment_status = paymentStatus;

      await supabase.from('orders').update(updateData).eq('id', orderId);
      return;
    } catch (err) {
      console.error('Error al actualizar en Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await getOrders();
    const updated = current.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          order_status: status,
          payment_status: paymentStatus || o.payment_status,
        };
      }
      return o;
    });
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('colada_orders_updated'));
  }
};

export const updateOrder = async (updatedOrder: Order): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('orders').update(updatedOrder).eq('id', updatedOrder.id);
      return;
    } catch (err) {
      console.error('Error al actualizar pedido en Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await getOrders();
    const updated = current.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('colada_orders_updated'));
  }
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('orders').delete().eq('id', orderId);
      return;
    } catch (err) {
      console.error('Error al eliminar en Supabase:', err);
    }
  }

  if (typeof window !== 'undefined') {
    const current = await getOrders();
    const updated = current.filter((o) => o.id !== orderId);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('colada_orders_updated'));
  }
};

export const calculateMetrics = (orders: Order[]): SalesMetrics => {
  const activeOrders = orders.filter((o) => o.order_status !== 'cancelado');

  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  const totalLiters = activeOrders.reduce((sum, o) => sum + (o.total_liters || 0), 0);
  const totalHalfLitersCount = activeOrders.reduce((sum, o) => sum + (o.half_liters || 0), 0);
  const totalLitersCount = activeOrders.reduce((sum, o) => sum + (o.liters || 0), 0);
  const totalBreadsCount = activeOrders.reduce((sum, o) => sum + (o.breads || 0), 0);

  const pendingOrders = activeOrders.filter((o) => o.order_status !== 'entregado').length;
  const deliveredOrders = activeOrders.filter((o) => o.order_status === 'entregado').length;
  const localOrders = activeOrders.filter((o) => o.delivery_type === 'local').length;
  const deliveryOrders = activeOrders.filter((o) => o.delivery_type === 'domicilio').length;

  const sellerMap: Record<
    string,
    { sellerName: string; orderCount: number; totalAmount: number; liters: number; breads: number }
  > = {};

  activeOrders.forEach((o) => {
    const seller = o.created_by_name || 'Desconocido';
    if (!sellerMap[seller]) {
      sellerMap[seller] = {
        sellerName: seller,
        orderCount: 0,
        totalAmount: 0,
        liters: 0,
        breads: 0,
      };
    }
    sellerMap[seller].orderCount += 1;
    sellerMap[seller].totalAmount += o.total_price || 0;
    sellerMap[seller].liters += o.total_liters || 0;
    sellerMap[seller].breads += o.breads || 0;
  });

  const sellerBreakdown = Object.values(sellerMap).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalRevenue,
    totalLiters,
    totalHalfLitersCount,
    totalLitersCount,
    totalBreadsCount,
    totalOrders: activeOrders.length,
    pendingOrders,
    deliveredOrders,
    localOrders,
    deliveryOrders,
    sellerBreakdown,
  };
};
