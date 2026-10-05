'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Order, DeliveryType, PaymentStatus, PaymentMethod } from '@/types';
import { PRICES } from '@/lib/constants';
import { saveOrder, updateOrder } from '@/lib/storage';
import {
  User,
  Phone,
  Plus,
  Minus,
  MapPin,
  Store,
  Bike,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeft,
} from 'lucide-react';

interface NewOrderFormProps {
  initialOrder?: Order | null;
  onOrderCreated: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onCancel: () => void;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({
  initialOrder,
  onOrderCreated,
  onOrderUpdated,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const isEditing = Boolean(initialOrder);

  // Estados del formulario inicializados con datos existentes si es edición
  const [clientName, setClientName] = useState(initialOrder?.client_name || '');
  const [clientPhone, setClientPhone] = useState(initialOrder?.client_phone || '');
  const [halfLiters, setHalfLiters] = useState<number>(initialOrder?.half_liters ?? 0);
  const [liters, setLiters] = useState<number>(initialOrder?.liters ?? 1);
  const [breads, setBreads] = useState<number>(initialOrder?.breads ?? 2);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(initialOrder?.delivery_type || 'local');
  const [deliveryAddress, setDeliveryAddress] = useState(initialOrder?.delivery_address || '');
  const [deliveryReference, setDeliveryReference] = useState(initialOrder?.delivery_reference || '');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(initialOrder?.payment_status || 'pendiente');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialOrder?.payment_method || 'efectivo');
  const [notes, setNotes] = useState(initialOrder?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Cálculos en vivo
  const totalLiters = useMemo(() => {
    return Number((halfLiters * 0.5 + liters * 1.0).toFixed(1));
  }, [halfLiters, liters]);

  const totalPrice = useMemo(() => {
    return Number(
      (
        halfLiters * PRICES.HALF_LITER +
        liters * PRICES.LITER +
        breads * PRICES.BREAD
      ).toFixed(2)
    );
  }, [halfLiters, liters, breads]);

  const qualifiesForDelivery = totalLiters >= PRICES.MIN_LITERS_FOR_DELIVERY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!clientName.trim()) {
      setFormError('Ingresa el nombre del cliente.');
      return;
    }

    if (totalLiters === 0 && breads === 0) {
      setFormError('Agrega al menos colada morada o panes al pedido.');
      return;
    }

    if (deliveryType === 'domicilio' && !deliveryAddress.trim()) {
      setFormError('Ingresa la dirección para la entrega a domicilio.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialOrder) {
        const updated: Order = {
          ...initialOrder,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || undefined,
          half_liters: halfLiters,
          liters: liters,
          breads: breads,
          total_liters: totalLiters,
          total_price: totalPrice,
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'domicilio' ? deliveryAddress.trim() : undefined,
          delivery_reference: deliveryType === 'domicilio' && deliveryReference.trim() ? deliveryReference.trim() : undefined,
          notes: notes.trim() || undefined,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
        };

        await updateOrder(updated);
        if (onOrderUpdated) {
          onOrderUpdated(updated);
        } else {
          onCancel();
        }
      } else {
        const uniqueId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const newOrder: Order = {
          id: uniqueId,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || undefined,
          half_liters: halfLiters,
          liters: liters,
          breads: breads,
          total_liters: totalLiters,
          total_price: totalPrice,
          delivery_type: deliveryType,
          delivery_address: deliveryType === 'domicilio' ? deliveryAddress.trim() : undefined,
          delivery_reference: deliveryType === 'domicilio' && deliveryReference.trim() ? deliveryReference.trim() : undefined,
          notes: notes.trim() || undefined,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          order_status: 'pendiente',
          created_by_id: currentUser?.id || 'usr-anon',
          created_by_name: currentUser?.name || 'Vendedor',
          created_at: new Date().toISOString(),
        };

        const saved = await saveOrder(newOrder);
        onOrderCreated(saved);
      }
    } catch (err) {
      console.error('Error guardando pedido:', err);
      setFormError('Ocurrió un error al guardar. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-32 px-4 max-w-xl mx-auto">
      {/* Barra superior de regreso */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800 hover:text-purple-950 py-1.5 px-2.5 rounded-xl hover:bg-purple-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Pedidos</span>
        </button>

        <span className="text-xs text-slate-500 font-medium">
          {isEditing ? (
            <span className="font-bold text-purple-900">Editando Pedido</span>
          ) : (
            <span>Vendedor: <strong className="text-purple-900">{currentUser?.name}</strong></span>
          )}
        </span>
      </div>

      {formError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Cliente */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
            <User className="w-4 h-4 text-purple-700" />
            1. Datos del Cliente
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Carmen Gómez, Dr. Morales"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono / WhatsApp (Opcional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ej: 0991234567"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
              />
            </div>
          </div>
        </div>

        {/* 2. Productos & Cantidades */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900">
              2. Productos del Pedido
            </h2>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
              Total: {totalLiters} L
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Medio Litro ($2.00) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Medio Litro (1/2 L)</p>
                <p className="text-xs text-purple-800 font-bold">
                  ${PRICES.HALF_LITER.toFixed(2)} c/u
                </p>
                {halfLiters > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Subtotal: ${(halfLiters * PRICES.HALF_LITER).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setHalfLiters((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-base text-slate-900">
                  {halfLiters}
                </span>
                <button
                  type="button"
                  onClick={() => setHalfLiters((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-purple-800 text-white hover:bg-purple-900 active:scale-95 flex items-center justify-center font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Un Litro ($3.00) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Un Litro (1 L o más)</p>
                <p className="text-xs text-purple-800 font-bold">
                  ${PRICES.LITER.toFixed(2)} c/u
                </p>
                {liters > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Subtotal: ${(liters * PRICES.LITER).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setLiters((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-base text-slate-900">
                  {liters}
                </span>
                <button
                  type="button"
                  onClick={() => setLiters((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-purple-800 text-white hover:bg-purple-900 active:scale-95 flex items-center justify-center font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Figuritas de Pan ($0.50) */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-semibold text-slate-900 text-sm">Figuritas de Pan</p>
                <p className="text-xs text-purple-800 font-bold">
                  ${PRICES.BREAD.toFixed(2)} c/u (50 ctvs)
                </p>
                {breads > 0 && (
                  <p className="text-[11px] text-slate-500">
                    Subtotal: ${(breads * PRICES.BREAD).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setBreads((prev) => Math.max(0, prev - 1))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-base text-slate-900">
                  {breads}
                </span>
                <button
                  type="button"
                  onClick={() => setBreads((prev) => prev + 1)}
                  className="w-9 h-9 rounded-xl bg-purple-800 text-white hover:bg-purple-900 active:scale-95 flex items-center justify-center font-bold shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Logística de Entrega */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900">
            3. Modalidad de Entrega
          </h2>

          {qualifiesForDelivery ? (
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>¡Califica a Domicilio!</strong> ({totalLiters}L acumulados)
                </span>
              </div>
              {deliveryType !== 'domicilio' && (
                <button
                  type="button"
                  onClick={() => setDeliveryType('domicilio')}
                  className="text-[11px] font-bold bg-purple-800 text-white px-2 py-1 rounded-lg shrink-0 shadow-sm"
                >
                  Elegir Domicilio
                </button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              * El envío a domicilio se ofrece a partir de <strong>3 litros</strong> (Actual: {totalLiters}L).
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryType('local')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                deliveryType === 'local'
                  ? 'bg-purple-800 text-white border-purple-800 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Retiro en Local</span>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType('domicilio')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                deliveryType === 'domicilio'
                  ? 'bg-purple-800 text-white border-purple-800 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>A Domicilio</span>
            </button>
          </div>

          {deliveryType === 'domicilio' && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección de Entrega <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-purple-700" />
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Calle principal, número y piso o dpto."
                    required={deliveryType === 'domicilio'}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referencia de Ubicación
                </label>
                <input
                  type="text"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                  placeholder="Ej: Frente al parque, timbre 402"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Pago y Notas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900">
            4. Estado de Pago
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Estado
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('pendiente')}
                  className={`py-1 px-1 rounded-lg text-xs font-semibold transition-all ${
                    paymentStatus === 'pendiente'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Por Cobrar
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('pagado')}
                  className={`py-1 px-1 rounded-lg text-xs font-semibold transition-all ${
                    paymentStatus === 'pagado'
                      ? 'bg-purple-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pagado
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Método
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('efectivo')}
                  className={`py-1 px-1 rounded-lg text-xs font-semibold transition-all ${
                    paymentMethod === 'efectivo'
                      ? 'bg-white text-purple-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transferencia')}
                  className={`py-1 px-1 rounded-lg text-xs font-semibold transition-all ${
                    paymentMethod === 'transferencia'
                      ? 'bg-white text-purple-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Transf.
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observación o nota adicional"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
              />
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR FIJA */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Total a Cobrar
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-purple-950">
                  ${totalPrice.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({totalLiters}L • {breads} {breads === 1 ? 'pan' : 'panes'})
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-6 bg-purple-800 hover:bg-purple-900 active:bg-purple-950 text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 active:scale-98 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Guardar Pedido'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
