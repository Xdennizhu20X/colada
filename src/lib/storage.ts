import { Order, UserProfile, SalesMetrics, SaleBatch } from '@/types';
import { INITIAL_USERS, getSaleName } from './constants';
import { supabase, isSupabaseConfigured } from './supabase';

const ORDERS_KEY = 'colada_orders_v3';
const USERS_KEY = 'colada_users_v3';
const SALES_BATCHES_KEY = 'colada_sales_batches_v1';
const CURRENT_SALE_KEY = 'colada_current_sale_num_v1';

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
      map.set(o.id, {
        ...o,
        sale_number: o.sale_number || 1,
      });
    }
  });
  return Array.from(map.values());
};

// Pedidos que pertenecen a una venta concreta
export const getOrdersBySale = (orders: Order[], saleNumber: number): Order[] =>
  orders.filter((o) => (o.sale_number || 1) === saleNumber);

// Pedidos archivados (todas las ventas menos la activa)
export const getArchivedOrders = (orders: Order[], currentSaleNumber: number): Order[] =>
  orders.filter((o) => (o.sale_number || 1) !== currentSaleNumber);

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
  if (!order.sale_number) {
    order.sale_number = await getCurrentSaleNumber();
  }

  if (isSupabaseConfigured && supabase) {
    try {
      let { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single();

      // Fallback en caso de que la columna combos aún no se haya creado en Supabase
      if (error && (error.message?.includes('combos') || error.code === 'PGRST204')) {
        const { combos: _, ...orderWithoutCombos } = order;
        const fallbackRes = await supabase
          .from('orders')
          .insert([orderWithoutCombos])
          .select()
          .single();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

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
      const { error } = await supabase.from('orders').update(updatedOrder).eq('id', updatedOrder.id);
      if (error && (error.message?.includes('combos') || error.code === 'PGRST204')) {
        const { combos: _, ...orderWithoutCombos } = updatedOrder;
        await supabase.from('orders').update(orderWithoutCombos).eq('id', updatedOrder.id);
      }
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
  // Contabiliza el total de panes requeridos (figuras sueltas + 1 puerca por cada combo)
  const totalBreadsCount = activeOrders.reduce(
    (sum, o) => sum + (o.breads || 0) + (o.combos || 0),
    0
  );
  const totalCombosCount = activeOrders.reduce((sum, o) => sum + (o.combos || 0), 0);

  const pendingOrders = activeOrders.filter((o) => o.order_status !== 'entregado').length;
  const deliveredOrders = activeOrders.filter((o) => o.order_status === 'entregado').length;
  const localOrders = activeOrders.filter((o) => o.delivery_type === 'local').length;
  const deliveryOrders = activeOrders.filter((o) => o.delivery_type === 'domicilio').length;

  const sellerMap: Record<
    string,
    { sellerName: string; orderCount: number; totalAmount: number; liters: number; breads: number; combos: number }
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
        combos: 0,
      };
    }
    sellerMap[seller].orderCount += 1;
    sellerMap[seller].totalAmount += o.total_price || 0;
    sellerMap[seller].liters += o.total_liters || 0;
    sellerMap[seller].breads += (o.breads || 0) + (o.combos || 0);
    sellerMap[seller].combos += o.combos || 0;
  });

  const sellerBreakdown = Object.values(sellerMap).sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    totalRevenue,
    totalLiters,
    totalHalfLitersCount,
    totalLitersCount,
    totalBreadsCount,
    totalCombosCount,
    totalOrders: activeOrders.length,
    pendingOrders,
    deliveredOrders,
    localOrders,
    deliveryOrders,
    sellerBreakdown,
  };
};

// ==========================================
// GESTIÓN DE LOTES DE VENTAS (VENTA 1, 2, 3...)
// ==========================================

const buildBatchId = (saleNumber: number) => `batch-${saleNumber}-${Date.now()}`;

const getFallbackBatches = (): SaleBatch[] => [
  {
    id: 'batch-1',
    sale_number: 1,
    name: getSaleName(1),
    status: 'activa',
    created_at: new Date().toISOString(),
  },
];

const readLocalBatches = (): SaleBatch[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SALES_BATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocalBatches = (batches: SaleBatch[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SALES_BATCHES_KEY, JSON.stringify(batches));
};

export const getCurrentSaleNumber = async (): Promise<number> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sales_batches')
        .select('sale_number')
        .eq('status', 'activa')
        .order('sale_number', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0].sale_number;
      }
    } catch (e) {
      console.error('Error obteniendo venta activa en Supabase:', e);
    }
  }

  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(CURRENT_SALE_KEY);
    if (raw) return parseInt(raw, 10) || 1;
  } catch {}
  return 1;
};

export const getSalesBatches = async (): Promise<SaleBatch[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('sales_batches')
        .select('*')
        .order('sale_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as SaleBatch[];
      }

      if (!error && data && data.length === 0) {
        const firstBatch: SaleBatch = {
          id: 'batch-1',
          sale_number: 1,
          name: getSaleName(1),
          status: 'activa',
          created_at: new Date().toISOString(),
        };
        await supabase.from('sales_batches').insert([firstBatch]);
        return [firstBatch];
      }
    } catch (e) {
      console.error('Error obteniendo lotes de ventas en Supabase:', e);
    }
  }

  const defaultInitial: SaleBatch[] = [
    {
      id: 'batch-1',
      sale_number: 1,
      name: getSaleName(1),
      status: 'activa',
      created_at: new Date().toISOString(),
    },
  ];

  if (typeof window === 'undefined') {
    return defaultInitial;
  }

  const stored = readLocalBatches();
  if (stored.length === 0) {
    writeLocalBatches(defaultInitial);
    localStorage.setItem(CURRENT_SALE_KEY, '1');
    return defaultInitial;
  }
  return stored;
};

export const closeCurrentSaleBatch = async (
  currentNum: number,
  metrics: SalesMetrics
): Promise<number> => {
  const nextNum = currentNum + 1;
  const now = new Date().toISOString();
  const totals = {
    total_revenue: metrics.totalRevenue,
    total_liters: metrics.totalLiters,
    total_breads: metrics.totalBreadsCount,
    total_orders: metrics.totalOrders,
  };

  // Actualizar en Supabase si está disponible
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Cerrar la venta actual (los pedidos NO se borran: quedan archivados por sale_number)
      const { error: closeError } = await supabase
        .from('sales_batches')
        .update({ status: 'cerrada', closed_at: now, ...totals })
        .eq('sale_number', currentNum);

      if (closeError) throw closeError;

      // 2. Crear la siguiente venta activa
      const { data: existing } = await supabase
        .from('sales_batches')
        .select('sale_number')
        .eq('sale_number', nextNum)
        .limit(1);

      if (existing && existing.length === 0) {
        const { error: insertError } = await supabase.from('sales_batches').insert([
          {
            id: buildBatchId(nextNum),
            sale_number: nextNum,
            name: getSaleName(nextNum),
            status: 'activa',
            created_at: now,
          },
        ]);
        if (insertError) throw insertError;
      } else if (existing && existing.length > 0) {
        await supabase
          .from('sales_batches')
          .update({ status: 'activa', closed_at: null })
          .eq('sale_number', nextNum);
      }
    } catch (e) {
      console.error('Error cerrando venta en Supabase:', e);
    }
  }

  // Actualizar en localStorage
  if (typeof window !== 'undefined') {
    const stored = readLocalBatches().length > 0 ? readLocalBatches() : getFallbackBatches();

    const updated = stored.map((b) => {
      if (b.sale_number === currentNum) {
        return {
          ...b,
          status: 'cerrada' as const,
          closed_at: now,
          ...totals,
        };
      }
      if (b.sale_number === nextNum) {
        return { ...b, status: 'activa' as const, closed_at: undefined };
      }
      return b;
    });

    if (!updated.some((b) => b.sale_number === nextNum)) {
      updated.push({
        id: buildBatchId(nextNum),
        sale_number: nextNum,
        name: getSaleName(nextNum),
        status: 'activa',
        created_at: now,
      });
    }

    writeLocalBatches(updated);
    localStorage.setItem(CURRENT_SALE_KEY, nextNum.toString());

    window.dispatchEvent(new Event('colada_orders_updated'));
    window.dispatchEvent(new Event('colada_sales_updated'));
  }

  return nextNum;
};

export const reopenSaleBatch = async (saleNumber: number): Promise<void> => {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('sales_batches').update({ status: 'cerrada' }).neq('sale_number', saleNumber);
      await supabase
        .from('sales_batches')
        .update({ status: 'activa', closed_at: null })
        .eq('sale_number', saleNumber);
    } catch (e) {
      console.error('Error reabriendo venta en Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const stored = readLocalBatches().length > 0 ? readLocalBatches() : getFallbackBatches();
    const updated = stored.map((b) =>
      b.sale_number === saleNumber
        ? { ...b, status: 'activa' as const, closed_at: undefined }
        : { ...b, status: 'cerrada' as const }
    );
    writeLocalBatches(updated);
    localStorage.setItem(CURRENT_SALE_KEY, saleNumber.toString());

    window.dispatchEvent(new Event('colada_orders_updated'));
    window.dispatchEvent(new Event('colada_sales_updated'));
  }
};

