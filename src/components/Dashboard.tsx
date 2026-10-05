'use client';

import React, { useState } from 'react';
import { SalesMetrics } from '@/types';
import {
  DollarSign,
  CupSoda,
  Cookie,
  Bike,
  Store,
  Users,
  Share2,
  Check,
  PackageCheck,
} from 'lucide-react';

interface DashboardProps {
  metrics: SalesMetrics;
}

export const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const text = `📊 *RESUMEN DE VENTA - COLADA MORADA*
💰 *Total en Ventas:* $${metrics.totalRevenue.toFixed(2)}
🥣 *Total Colada:* ${metrics.totalLiters} Litros (${metrics.totalLitersCount} de 1L, ${metrics.totalHalfLitersCount} de 1/2L)
🥖 *Figuritas de Pan:* ${metrics.totalBreadsCount} panes
📦 *Total Pedidos:* ${metrics.totalOrders} (${metrics.deliveryOrders} a domicilio, ${metrics.localOrders} en local)
✅ *Entregados:* ${metrics.deliveredOrders} | ⏳ *Pendientes:* ${metrics.pendingOrders}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="pb-28 px-4 max-w-xl mx-auto space-y-4">
      {/* Botón rápido para compartir por WhatsApp */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Resumen y Cuadre</h2>
          <p className="text-xs text-slate-500">Métricas acumuladas en tiempo real</p>
        </div>
        <button
          onClick={handleCopySummary}
          className="flex items-center gap-1.5 py-2 px-3 bg-purple-800 hover:bg-purple-900 text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>¡Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span>Copiar WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {/* Tarjetas Principales de Métricas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Dinero */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 mb-2">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Ventas Totales
          </span>
          <span className="text-2xl font-black text-purple-950">
            ${metrics.totalRevenue.toFixed(2)}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">
            En {metrics.totalOrders} pedidos
          </p>
        </div>

        {/* Total Litros */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 mb-2">
            <CupSoda className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Total Colada
          </span>
          <span className="text-2xl font-black text-purple-950">
            {metrics.totalLiters} L
          </span>
          <p className="text-[11px] text-slate-400 mt-1">
            {metrics.totalLitersCount}L + {metrics.totalHalfLitersCount} (1/2L)
          </p>
        </div>

        {/* Figuritas de Pan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 mb-2">
            <Cookie className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            Figuritas de Pan
          </span>
          <span className="text-2xl font-black text-purple-950">
            {metrics.totalBreadsCount}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">
            Panes por encargar
          </p>
        </div>

        {/* A Domicilio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 mb-2">
            <Bike className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
            A Domicilio
          </span>
          <span className="text-2xl font-black text-purple-950">
            {metrics.deliveryOrders}
          </span>
          <p className="text-[11px] text-slate-400 mt-1">
            vs {metrics.localOrders} en local
          </p>
        </div>
      </div>

      {/* Entregas */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-1.5">
          <PackageCheck className="w-4 h-4 text-purple-700" />
          Estado de Entregas
        </h3>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl">
            <span className="text-xs font-semibold text-amber-800 block">Pendientes</span>
            <span className="text-xl font-bold text-amber-950">{metrics.pendingOrders}</span>
          </div>
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl">
            <span className="text-xs font-semibold text-emerald-800 block">Entregados</span>
            <span className="text-xl font-bold text-emerald-950">{metrics.deliveredOrders}</span>
          </div>
        </div>
      </div>

      {/* Ventas por Vendedor */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-purple-700" />
          Ventas por Vendedor
        </h3>

        {metrics.sellerBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Aún no hay pedidos registrados.
          </p>
        ) : (
          <div className="space-y-2">
            {metrics.sellerBreakdown.map((seller, idx) => (
              <div
                key={seller.sellerName}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{seller.sellerName}</p>
                    <p className="text-[10px] text-slate-400">
                      {seller.orderCount} {seller.orderCount === 1 ? 'pedido' : 'pedidos'} • {seller.liters}L colada • {seller.breads} panes
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-purple-900">
                    ${seller.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
