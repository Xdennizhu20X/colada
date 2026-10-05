'use client';

import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, PaymentStatus } from '@/types';
import { updateOrderStatus, deleteOrder, updateOrder } from '@/lib/storage';
import { PRICES } from '@/lib/constants';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Search,
  MapPin,
  Store,
  Bike,
  User,
  Phone,
  CheckCircle,
  Clock,
  Trash2,
  Plus,
  Check,
  Edit,
} from 'lucide-react';

// Ícono estilizado de Tarrina / Envase de Colada Morada
const TarrinaIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Tapa de la tarrina */}
    <path d="M3 7h18" />
    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    {/* Vaso / cuerpo cónico de la tarrina */}
    <path d="M5.5 7l1.5 12.5a2 2 0 0 0 2 1.5h6a2 2 0 0 0 2-1.5L18.5 7" />
    {/* Línea de contenido de colada */}
    <path d="M7.5 12.5h9" strokeDasharray="1.5 1.5" />
  </svg>
);

// Ícono estilizado de Guagua / Figurita de Pan
const PanIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Silueta de la guagua de pan */}
    <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5C8 10.5 7 12 7 14c0 1.5.8 2.8 2 3.5-.8 1-.9 2.5 0 3.8.7.9 2 1.7 3 1.7s2.3-.8 3-1.7c.9-1.3.8-2.8 0-3.8 1.2-.7 2-2 2-3.5 0-2-1-3.5-3-4.5 1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z" />
    {/* Ojos */}
    <circle cx="10" cy="5" r="0.8" fill="currentColor" />
    <circle cx="14" cy="5" r="0.8" fill="currentColor" />
    {/* Sonrisa */}
    <path d="M11 7.5c.6.4 1.4.4 2 0" />
    {/* Glaseado decorativo tradicional */}
    <path d="M10 13h4" />
    <path d="M9.5 17h5" />
  </svg>
);

// Formateador visual para litros y tarrinas
const formatLitersDisplay = (liters: number, halfLiters: number, totalLiters: number) => {
  if (totalLiters === 0) {
    return {
      quantity: '0 L',
      badge: 'Sin colada',
      breakdown: null,
    };
  }

  let quantityText = '';
  if (totalLiters === 0.5) {
    quantityText = '½ Litro';
  } else if (Number.isInteger(totalLiters)) {
    quantityText = `${totalLiters} ${totalLiters === 1 ? 'Litro' : 'Litros'}`;
  } else {
    const whole = Math.floor(totalLiters);
    quantityText = `${whole} ½ Litros`;
  }

  const parts: string[] = [];
  if (liters > 0) {
    parts.push(`${liters} ${liters === 1 ? 'tarrina de 1L' : 'tarrinas de 1L'}`);
  }
  if (halfLiters > 0) {
    parts.push(`${halfLiters} ${halfLiters === 1 ? 'tarrina de ½L' : 'tarrinas de ½L'}`);
  }

  return {
    quantity: quantityText,
    badge: `${totalLiters}L total`,
    breakdown: parts.join(' + '),
  };
};

interface OrderListProps {
  orders: Order[];
  onRefresh: () => void;
  onOpenNewOrder: () => void;
  onEditOrder: (order: Order) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onRefresh,
  onOpenNewOrder,
  onEditOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'delivered' | 'domicilio'>('all');

  // Estado del Modal de Confirmación personalizado (sin alertas nativas de navegador)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'purple' | 'danger' | 'success';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    variant: 'purple',
    action: async () => {},
  });

  // Ordenamiento: Los pedidos ENTREGADOS van al final de la lista para que no estorben
  const sortedAndFilteredOrders = useMemo(() => {
    const list = orders.filter((order) => {
      const query = searchTerm.toLowerCase();
      const matchSearch =
        order.client_name.toLowerCase().includes(query) ||
        order.created_by_name.toLowerCase().includes(query) ||
        (order.delivery_address && order.delivery_address.toLowerCase().includes(query));

      if (!matchSearch) return false;

      if (filterType === 'pending') return order.order_status !== 'entregado';
      if (filterType === 'delivered') return order.order_status === 'entregado';
      if (filterType === 'domicilio') return order.delivery_type === 'domicilio';

      return true;
    });

    // Ordenar: pendientes primero, entregados al final. Dentro de cada grupo, el más reciente arriba
    return list.sort((a, b) => {
      const aDelivered = a.order_status === 'entregado';
      const bDelivered = b.order_status === 'entregado';

      if (aDelivered && !bDelivered) return 1;
      if (!aDelivered && bDelivered) return -1;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, searchTerm, filterType]);

  // Manejadores con modal de confirmación
  const promptTogglePayment = (order: Order) => {
    const isPaid = order.payment_status === 'pagado';
    const nextStatus: PaymentStatus = isPaid ? 'pendiente' : 'pagado';

    setModalConfig({
      isOpen: true,
      title: isPaid ? '¿Cambiar a Por Cobrar?' : '¿Confirmar Pago?',
      description: isPaid
        ? `El pedido de ${order.client_name} quedará como pendiente de cobro.`
        : `¿Confirmas que se recibió el pago de $${order.total_price.toFixed(2)} de ${order.client_name}?`,
      confirmText: isPaid ? 'Marcar Por Cobrar' : 'Confirmar Cobro',
      variant: isPaid ? 'purple' : 'success',
      action: async () => {
        await updateOrderStatus(order.id, order.order_status, nextStatus);
        onRefresh();
      },
    });
  };

  const promptToggleDelivery = (order: Order) => {
    const isDelivered = order.order_status === 'entregado';
    const nextStatus: OrderStatus = isDelivered ? 'pendiente' : 'entregado';

    setModalConfig({
      isOpen: true,
      title: isDelivered ? '¿Regresar a Pendiente?' : '¿Marcar como Entregado?',
      description: isDelivered
        ? `El pedido de ${order.client_name} volverá a la lista de pedidos pendientes.`
        : `El pedido de ${order.client_name} se marcará como entregado y se moverá al final de la lista.`,
      confirmText: isDelivered ? 'Mover a Pendiente' : 'Marcar Entregado',
      variant: isDelivered ? 'purple' : 'success',
      action: async () => {
        await updateOrderStatus(order.id, nextStatus);
        onRefresh();
      },
    });
  };

  const promptDelete = (order: Order) => {
    setModalConfig({
      isOpen: true,
      title: '¿Eliminar Pedido?',
      description: `Esta acción borrará de forma definitiva el pedido de ${order.client_name} por $${order.total_price.toFixed(2)}.`,
      confirmText: 'Sí, Eliminar',
      variant: 'danger',
      action: async () => {
        await deleteOrder(order.id);
        onRefresh();
      },
    });
  };

  // Ediciones rápidas (+1 Litro, +1 Pan) con confirmación
  const promptQuickAddLiter = (order: Order) => {
    const newLiters = order.liters + 1;
    const newTotalLiters = Number((order.half_liters * 0.5 + newLiters * 1.0).toFixed(1));
    const newPrice = Number((order.total_price + PRICES.LITER).toFixed(2));

    setModalConfig({
      isOpen: true,
      title: '¿Añadir +1 Litro de Colada?',
      description: `Se agregará 1 Litro al pedido de ${order.client_name}. Total pasará de $${order.total_price.toFixed(2)} a $${newPrice.toFixed(2)} (${newTotalLiters}L).`,
      confirmText: '+1 Litro ($3.00)',
      variant: 'purple',
      action: async () => {
        const updated: Order = {
          ...order,
          liters: newLiters,
          total_liters: newTotalLiters,
          total_price: newPrice,
        };
        await updateOrder(updated);
        onRefresh();
      },
    });
  };

  const promptQuickAddBread = (order: Order) => {
    const newBreads = order.breads + 1;
    const newPrice = Number((order.total_price + PRICES.BREAD).toFixed(2));

    setModalConfig({
      isOpen: true,
      title: '¿Añadir +1 Figurita de Pan?',
      description: `Se agregará 1 pan al pedido de ${order.client_name}. Total pasará de $${order.total_price.toFixed(2)} a $${newPrice.toFixed(2)} (${newBreads} panes).`,
      confirmText: '+1 Pan ($0.50)',
      variant: 'purple',
      action: async () => {
        const updated: Order = {
          ...order,
          breads: newBreads,
          total_price: newPrice,
        };
        await updateOrder(updated);
        onRefresh();
      },
    });
  };

  return (
    <div className="pb-28 px-4 max-w-xl mx-auto space-y-4">
      {/* Botón Principal para Añadir Pedido */}
      <div>
        <button
          onClick={onOpenNewOrder}
          className="w-full py-3 px-4 bg-purple-800 hover:bg-purple-900 active:bg-purple-950 text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          <Plus className="w-5 h-5" />
          <span>+ Añadir Nuevo Pedido</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente, vendedor o dirección..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 shadow-sm"
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            filterType === 'all'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({orders.length})
        </button>
        <button
          onClick={() => setFilterType('pending')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            filterType === 'pending'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Pendientes ({orders.filter((o) => o.order_status !== 'entregado').length})
        </button>
        <button
          onClick={() => setFilterType('domicilio')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            filterType === 'domicilio'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          A Domicilio ({orders.filter((o) => o.delivery_type === 'domicilio').length})
        </button>
        <button
          onClick={() => setFilterType('delivered')}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
            filterType === 'delivered'
              ? 'bg-purple-800 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Entregados ({orders.filter((o) => o.order_status === 'entregado').length})
        </button>
      </div>

      {/* Lista de Pedidos */}
      {sortedAndFilteredOrders.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-slate-500 text-sm">No hay pedidos con este filtro.</p>
          <button
            onClick={onOpenNewOrder}
            className="mt-3 text-xs font-semibold text-purple-700 hover:underline"
          >
            + Registrar un pedido
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAndFilteredOrders.map((order) => {
            const isDelivered = order.order_status === 'entregado';
            const isPaid = order.payment_status === 'pagado';
            const litersInfo = formatLitersDisplay(order.liters, order.half_liters, order.total_liters);

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${
                  isDelivered
                    ? 'border-slate-200 bg-slate-50/80 opacity-75'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
                      {order.client_name}
                    </h3>
                    {order.client_phone && (
                      <a
                        href={`tel:${order.client_phone}`}
                        className="inline-flex items-center gap-1 text-xs text-purple-700 hover:underline mt-0.5"
                      >
                        <Phone className="w-3 h-3 text-purple-600" />
                        <span>{order.client_phone}</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botón de Editar Completo */}
                    <button
                      onClick={() => onEditOrder(order)}
                      title="Editar pedido completo"
                      className="p-1.5 text-slate-500 hover:text-purple-800 hover:bg-purple-50 rounded-lg border border-slate-200 transition-all text-xs flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">Editar</span>
                    </button>

                    {/* Modalidad de Entrega */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                        order.delivery_type === 'domicilio'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {order.delivery_type === 'domicilio' ? (
                        <>
                          <Bike className="w-3.5 h-3.5 text-purple-700" />
                          <span>Domicilio</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-slate-500" />
                          <span>Local</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* BLOQUES VISUALES DESTACADOS: COLADA (TARRINA) Y PAN */}
                <div className="grid grid-cols-2 gap-2 my-2.5">
                  {/* Bloque Colada Morada (Tarrina) */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      order.total_liters > 0
                        ? 'bg-purple-50/80 border-purple-200/90 text-purple-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-200/70 text-purple-900 flex items-center justify-center shrink-0">
                          <TarrinaIcon className="w-4 h-4 text-purple-900" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-purple-900">
                          Colada
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-200/60 text-purple-900">
                        {litersInfo.badge}
                      </span>
                    </div>

                    <div className="mt-1">
                      <p className="text-lg font-black text-purple-950 leading-tight">
                        {litersInfo.quantity}
                      </p>
                      {litersInfo.breakdown ? (
                        <p className="text-[11px] text-purple-800 font-medium truncate mt-0.5">
                          {litersInfo.breakdown}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          Sin tarrinas
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bloque Figuritas de Pan */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      order.breads > 0
                        ? 'bg-amber-50/80 border-amber-200/90 text-amber-950 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                          <PanIcon className="w-4 h-4 text-amber-900" />
                        </div>
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
                          Pan
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200/60 text-amber-900">
                        {order.breads > 0 ? `${order.breads} uds` : '0 uds'}
                      </span>
                    </div>

                    <div className="mt-1">
                      <p className="text-lg font-black text-amber-950 leading-tight">
                        {order.breads} {order.breads === 1 ? 'Figura' : 'Figuras'}
                      </p>
                      <p className="text-[11px] text-amber-800 font-medium truncate mt-0.5">
                        {order.breads > 0
                          ? `${order.breads} ${order.breads === 1 ? 'figurita de pan' : 'figuritas de pan'}`
                          : 'Sin figuritas'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dirección si es a domicilio */}
                {order.delivery_type === 'domicilio' && order.delivery_address && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-0.5 my-2">
                    <div className="flex items-start gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                      <span>{order.delivery_address}</span>
                    </div>
                    {order.delivery_reference && (
                      <p className="text-[11px] text-slate-500 pl-5">
                        Ref: {order.delivery_reference}
                      </p>
                    )}
                  </div>
                )}

                {order.notes && (
                  <p className="text-[11px] text-slate-500 italic px-1 my-1">
                    Nota: {order.notes}
                  </p>
                )}

                {/* BARRA DE EDICIÓN RÁPIDA (+1L, +1 Pan) */}
                {!isDelivered && (
                  <div className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs mb-2.5 mt-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Aumento Rápido:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => promptQuickAddLiter(order)}
                        title="Añadir 1 Litro"
                        className="py-1 px-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-900 font-bold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                      >
                        <TarrinaIcon className="w-3.5 h-3.5 text-purple-800" />
                        <span>+1 Litro</span>
                      </button>

                      <button
                        onClick={() => promptQuickAddBread(order)}
                        title="Añadir 1 Figurita de Pan"
                        className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-900 font-bold text-[11px] flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                      >
                        <PanIcon className="w-3.5 h-3.5 text-amber-800" />
                        <span>+1 Pan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Pie: Total, Vendedor y Acciones */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-purple-700" />
                      <span>Ingresó:</span>
                      <strong className="text-slate-800 font-semibold">
                        {order.created_by_name}
                      </strong>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-purple-950">
                        ${order.total_price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Acciones Rápidas con Modal */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                    {/* Botón Cobro */}
                    <button
                      onClick={() => promptTogglePayment(order)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{isPaid ? 'Pagado' : 'Por Cobrar'}</span>
                    </button>

                    {/* Botón Entrega */}
                    <button
                      onClick={() => promptToggleDelivery(order)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 ${
                        isDelivered
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isDelivered ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Entregado</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Pendiente</span>
                        </>
                      )}
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => promptDelete(order)}
                      className="py-1.5 px-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-1 transition-all active:scale-95"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Borrar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Flotante Inferior para Añadir Pedido */}
      <button
        onClick={onOpenNewOrder}
        aria-label="Añadir pedido"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-purple-800 hover:bg-purple-900 active:bg-purple-950 text-white rounded-full shadow-lg shadow-purple-900/30 flex items-center justify-center transition-all active:scale-90"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal de Confirmación Moderno */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        onConfirm={async () => {
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
          await modalConfig.action();
        }}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
