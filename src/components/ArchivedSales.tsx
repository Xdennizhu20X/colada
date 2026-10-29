'use client';

import React, { useState, useMemo } from 'react';
import { Order, SaleBatch, SalesMetrics } from '@/types';
import { calculateMetrics, reopenSaleBatch } from '@/lib/storage';
import { getSaleName } from '@/lib/constants';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Archive,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Share2,
  RotateCcw,
  Search,
  Check,
  Trophy,
} from 'lucide-react';

interface ArchivedSalesProps {
  salesBatches: SaleBatch[];
  allOrders: Order[];
  currentSaleNumber: number;
  onBack: () => void;
  onRefresh: () => void;
}

export const ArchivedSales: React.FC<ArchivedSalesProps> = ({
  salesBatches,
  allOrders,
  currentSaleNumber,
  onBack,
  onRefresh,
}) => {
  const [expandedSaleNumber, setExpandedSaleNumber] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedBatch, setCopiedBatch] = useState<number | null>(null);
  const [copiedGlobal, setCopiedGlobal] = useState(false);

  // Modal para confirmar reapertura de venta
  const [reopenModal, setReopenModal] = useState<{
    isOpen: boolean;
    saleNumber: number;
    saleName: string;
  }>({
    isOpen: false,
    saleNumber: 0,
    saleName: '',
  });

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  const formatDateTime = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  // Gran Recopilación Global (todas las ventas activas y cerradas combinadas)
  const globalMetrics = useMemo(() => {
    return calculateMetrics(allOrders);
  }, [allOrders]);

  // Métricas solo de las ventas ya cerradas (lo realmente archivado)
  const archivedMetrics = useMemo(() => {
    const archived = allOrders.filter((o) => (o.sale_number || 1) !== currentSaleNumber);
    return calculateMetrics(archived);
  }, [allOrders, currentSaleNumber]);

  // Top vendedores históricos para la recopilación
  const topSellers = useMemo(
    () => globalMetrics.sellerBreakdown.slice(0, 5),
    [globalMetrics]
  );

  // Agrupar pedidos por número de venta
  const ordersBySale = useMemo(() => {
    const map = new Map<number, Order[]>();
    allOrders.forEach((o) => {
      const saleNum = o.sale_number || 1;
      const list = map.get(saleNum) || [];
      list.push(o);
      map.set(saleNum, list);
    });
    return map;
  }, [allOrders]);

  // Ventas ordenadas: primero las cerradas (más recientes) y la activa al final
  const sortedBatches = useMemo(() => {
    return [...salesBatches].sort((a, b) => {
      if (a.sale_number === currentSaleNumber) return 1;
      if (b.sale_number === currentSaleNumber) return -1;
      return b.sale_number - a.sale_number;
    });
  }, [salesBatches, currentSaleNumber]);

  const matchesSearch = (order: Order) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      order.client_name.toLowerCase().includes(q) ||
      order.created_by_name.toLowerCase().includes(q) ||
      (order.client_phone || '').toLowerCase().includes(q) ||
      (order.delivery_address || '').toLowerCase().includes(q)
    );
  };

  const totalArchivedOrders = archivedMetrics.totalOrders;

  // Manejador para copiar recopilación global por WhatsApp
  const handleCopyGlobalSummary = () => {
    const closedLines = salesBatches
      .filter((b) => b.sale_number !== currentSaleNumber)
      .sort((a, b) => a.sale_number - b.sale_number)
      .map(
        (b) =>
          `• ${b.name}: $${(b.total_revenue ?? 0).toFixed(2)} • ${b.total_liters ?? 0}L • ${
            b.total_breads ?? 0
          } panes`
      )
      .join('\n');

    const globalStandaloneBreads = globalMetrics.totalBreadsCount - (globalMetrics.totalCombosCount || 0);
    const globalBreadBreakdown =
      globalMetrics.totalCombosCount > 0
        ? ` (${globalStandaloneBreads} figuras + ${globalMetrics.totalCombosCount} puercas de combo)`
        : '';
    const combosGlobal =
      globalMetrics.totalCombosCount > 0
        ? `\n🎁 *Combos Totales:* ${globalMetrics.totalCombosCount} (vaso + puerca)`
        : '';

    const text = `📊 *RECOPILACIÓN GLOBAL DE TODAS LAS VENTAS*
🥣 *Colada Morada & Figuritas de Pan*
━━━━━━━━━━━━━━━━━━━━━━
💰 *Gran Total:* $${globalMetrics.totalRevenue.toFixed(2)}
🥣 *Colada Total:* ${globalMetrics.totalLiters} Litros (${globalMetrics.totalLitersCount} de 1L, ${globalMetrics.totalHalfLitersCount} de ½L)
🥖 *Total Panes:* ${globalMetrics.totalBreadsCount} panes${globalBreadBreakdown}${combosGlobal}
📦 *Pedidos Totales:* ${globalMetrics.totalOrders} (${globalMetrics.deliveryOrders} a domicilio, ${globalMetrics.localOrders} en local)
━━━━━━━━━━━━━━
📚 *VENTAS CERRADAS (${salesBatches.length - 1}):*
${closedLines || '• (ninguna todavía)'}
━━━━━━━━━━━━━━━━━━━━━━
🏆 *Ventas por Vendedor:*
${globalMetrics.sellerBreakdown
  .map(
    (s, i) =>
      `${i + 1}. ${s.sellerName}: $${s.totalAmount.toFixed(2)} (${s.orderCount} pedidos • ${s.liters}L / ${s.breads} panes${(s.combos ?? 0) > 0 ? ` / ${s.combos} combos` : ''})`
  )
  .join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedGlobal(true);
    setTimeout(() => setCopiedGlobal(false), 2500);
  };

  // Manejador para copiar resumen de una venta específica
  const handleCopyBatchSummary = (batch: SaleBatch, metrics: SalesMetrics) => {
    const batchStandaloneBreads = metrics.totalBreadsCount - (metrics.totalCombosCount || 0);
    const batchBreadBreakdown =
      metrics.totalCombosCount > 0
        ? ` (${batchStandaloneBreads} figuras + ${metrics.totalCombosCount} puercas de combo)`
        : '';
    const combosBatch =
      metrics.totalCombosCount > 0
        ? `\n🎁 *Combos:* ${metrics.totalCombosCount} (vaso + puerca)`
        : '';

    const text = `📊 *RESUMEN - ${(batch.name || getSaleName(batch.sale_number)).toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━
💰 *Total Recaudado:* $${metrics.totalRevenue.toFixed(2)}
🥣 *Colada:* ${metrics.totalLiters} Litros (${metrics.totalLitersCount} de 1L, ${metrics.totalHalfLitersCount} de ½L)
🥖 *Total Panes:* ${metrics.totalBreadsCount} panes${batchBreadBreakdown}${combosBatch}
📦 *Pedidos:* ${metrics.totalOrders}
${
  batch.closed_at
    ? `📅 *Cerrada el:* ${formatDateTime(batch.closed_at)}`
    : '⚡ *Estado:* Activa actualmente'
}`;

    navigator.clipboard.writeText(text);
    setCopiedBatch(batch.sale_number);
    setTimeout(() => setCopiedBatch(null), 2500);
  };

  const handleReopenConfirm = async () => {
    await reopenSaleBatch(reopenModal.saleNumber);
    setReopenModal({ isOpen: false, saleNumber: 0, saleName: '' });
    onRefresh();
  };

  return (
    <div className="pb-28 px-4 max-w-xl mx-auto space-y-4">
      {/* Botón Volver y Encabezado */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800 hover:text-purple-950 py-1.5 px-2.5 rounded-xl hover:bg-purple-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Pedidos</span>
        </button>

        <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
          <Archive className="w-3.5 h-3.5 text-purple-700" />
          <span>Historial de Ventas</span>
        </span>
      </div>

      {/* TARJETA 1: GRAN RECOPILACIÓN TOTAL HISTÓRICA */}
      <div className="bg-gradient-to-br from-purple-900 to-indigo-950 text-white rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Recopilación General
            </span>
            <h2 className="text-lg font-black tracking-tight text-white">
              Total Histórico Acumulado
            </h2>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Suma de todas las ventas (cerradas y activas)
            </p>
          </div>

          <button
            onClick={handleCopyGlobalSummary}
            className="flex items-center gap-1.5 py-2 px-3 bg-purple-800/80 hover:bg-purple-700 text-white rounded-xl text-xs font-bold border border-purple-700/60 transition-all shrink-0 active:scale-95"
          >
            {copiedGlobal ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Copiar Todo</span>
              </>
            )}
          </button>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="bg-purple-950/60 border border-purple-800/60 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wide block">
              Gran Total Ventas
            </span>
            <span className="text-2xl font-black text-amber-400">
              ${globalMetrics.totalRevenue.toFixed(2)}
            </span>
            <p className="text-[10px] text-purple-300 mt-0.5">
              En {globalMetrics.totalOrders} pedidos totales
            </p>
          </div>

          <div className="bg-purple-950/60 border border-purple-800/60 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wide block">
              Colada Total
            </span>
            <span className="text-2xl font-black text-purple-100">
              {globalMetrics.totalLiters} L
            </span>
            <p className="text-[10px] text-purple-300 mt-0.5">
              {globalMetrics.totalLitersCount}L + {globalMetrics.totalHalfLitersCount} (½L)
            </p>
          </div>

          <div className="bg-purple-950/60 border border-purple-800/60 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wide block">
              Panes Totales
            </span>
            <span className="text-2xl font-black text-amber-300">
              {globalMetrics.totalBreadsCount}
            </span>
            <p className="text-[10px] text-purple-300 mt-0.5">
              Figuritas encargadas
            </p>
          </div>

          <div className="bg-purple-950/60 border border-purple-800/60 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wide block">
              Logística
            </span>
            <span className="text-2xl font-black text-teal-300">
              {globalMetrics.deliveryOrders}
            </span>
            <p className="text-[10px] text-purple-300 mt-0.5">
              Domicilio vs {globalMetrics.localOrders} Local
            </p>
          </div>
        </div>

        {/* Top Vendedores Históricos */}
        {topSellers.length > 0 && (
          <div className="pt-3 border-t border-purple-800/60">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5 mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Top Vendedores (histórico)</span>
            </h3>
            <div className="space-y-1.5">
              {topSellers.map((seller, idx) => (
                <div
                  key={seller.sellerName}
                  className="flex items-center justify-between bg-purple-950/40 border border-purple-800/50 rounded-xl px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 shrink-0 rounded-md bg-purple-800 text-purple-100 flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-purple-100 truncate">
                      {seller.sellerName}
                    </span>
                    <span className="text-[10px] text-purple-300/80">
                      {seller.orderCount} ped.
                    </span>
                  </div>
                  <span className="text-[11px] font-black text-amber-400 shrink-0">
                    ${seller.totalAmount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: LISTA DE CADA VENTA (PRIMERA VENTA, SEGUNDA VENTA, ETC.) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-purple-700" />
            <span>Ventas Registradas ({salesBatches.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            {totalArchivedOrders} pedidos archivados
          </span>
        </div>

        {/* Buscador dentro del archivo */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en el archivo por cliente, teléfono, vendedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 shadow-sm"
          />
        </div>

        {sortedBatches.map((batch) => {
          const allBatchOrders = ordersBySale.get(batch.sale_number) || [];
          const visibleBatchOrders = allBatchOrders.filter(matchesSearch);
          const batchMetrics = calculateMetrics(allBatchOrders);
          const isCurrentActive = batch.sale_number === currentSaleNumber;
          const isExpanded =
            expandedSaleNumber === batch.sale_number ||
            (searchTerm.trim().length > 0 && visibleBatchOrders.length > 0);

          return (
            <div
              key={batch.id || `batch-${batch.sale_number}`}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
                isCurrentActive
                  ? 'border-purple-300 ring-2 ring-purple-100'
                  : 'border-slate-200'
              }`}
            >
              {/* Cabecera de la Venta */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        {batch.name || getSaleName(batch.sale_number)}
                      </h4>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          isCurrentActive
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isCurrentActive ? 'Venta Activa' : 'Archivada'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Inició: {formatDate(batch.created_at)}</span>
                      {batch.closed_at && <span>• Cerró: {formatDate(batch.closed_at)}</span>}
                    </p>
                  </div>

                  {/* Acciones de la Venta */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyBatchSummary(batch, batchMetrics)}
                      title="Copiar resumen para WhatsApp"
                      className="p-1.5 text-slate-500 hover:text-purple-800 hover:bg-purple-50 rounded-lg border border-slate-200 transition-all text-xs flex items-center gap-1"
                    >
                      {copiedBatch === batch.sale_number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>

                    {!isCurrentActive && (
                      <button
                        onClick={() =>
                          setReopenModal({
                            isOpen: true,
                            saleNumber: batch.sale_number,
                            saleName: batch.name || getSaleName(batch.sale_number),
                          })
                        }
                        title="Reabrir esta venta para seguir editando"
                        className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg border border-amber-200 transition-all text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas Resumidas de esta Venta */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total</span>
                    <strong className="text-xs font-black text-purple-950">
                      ${batchMetrics.totalRevenue.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Colada</span>
                    <strong className="text-xs font-black text-purple-900">
                      {batchMetrics.totalLiters} L
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Panes</span>
                    <strong className="text-xs font-black text-amber-900">
                      {batchMetrics.totalBreadsCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pedidos</span>
                    <strong className="text-xs font-black text-slate-700">
                      {allBatchOrders.length}
                    </strong>
                  </div>
                </div>

                {/* Botón para Desplegar / Ocultar Pedidos de esta Venta */}
                {allBatchOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedSaleNumber(isExpanded ? null : batch.sale_number)}
                    className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-900 rounded-xl text-xs font-bold flex items-center justify-between transition-all"
                  >
                    <span>
                      {isExpanded
                        ? 'Ocultar pedidos de esta venta'
                        : `Ver los ${allBatchOrders.length} pedidos de esta venta`}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* DETALLE DESPLEGABLE DE PEDIDOS DE LA VENTA */}
              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  {visibleBatchOrders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      {searchTerm.trim()
                        ? `Ningún pedido coincide con "${searchTerm.trim()}".`
                        : 'No hay pedidos registrados en esta venta.'}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {visibleBatchOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <strong className="text-slate-900 font-bold block">
                                {order.client_name}
                              </strong>
                              {order.client_phone && (
                                <span className="text-[11px] text-purple-700">
                                  {order.client_phone}
                                </span>
                              )}
                            </div>

                            <span className="text-sm font-black text-purple-950">
                              ${order.total_price.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <span>
                              🥣 {order.total_liters}L Colada • 🥖 {(order.breads || 0) + (order.combos || 0)} Panes
                              {(order.combos ?? 0) > 0 ? ` • 🎁 ${order.combos} Combos` : ''}
                            </span>
                            <span className="capitalize font-medium text-slate-500">
                              {order.delivery_type === 'domicilio' ? '🛵 Domicilio' : '🏪 Local'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Vendido por: {order.created_by_name}</span>
                            <span className={order.payment_status === 'pagado' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                              {order.payment_status === 'pagado' ? '✓ Pagado' : '⏳ Por Cobrar'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación para reabrir una venta cerrada */}
      <ConfirmModal
        isOpen={reopenModal.isOpen}
        title={`¿Reabrir ${reopenModal.saleName}?`}
        description={`Esta venta volverá a ser la venta activa y sus pedidos volverán a la lista de Pedidos. La venta que estaba activa pasará al archivo. Los datos nunca se borran.`}
        confirmText="Sí, Reabrir Venta"
        variant="purple"
        onConfirm={handleReopenConfirm}
        onCancel={() => setReopenModal({ isOpen: false, saleNumber: 0, saleName: '' })}
      />
    </div>
  );
};
