'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/LoginForm';
import { Navbar } from '@/components/Navbar';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';
import { Dashboard } from '@/components/Dashboard';
import { UserManagement } from '@/components/UserManagement';
import { ArchivedSales } from '@/components/ArchivedSales';
import { Order, SalesMetrics, SaleBatch } from '@/types';
import {
  getOrders,
  calculateMetrics,
  deduplicateOrders,
  getSalesBatches,
  getCurrentSaleNumber,
  closeCurrentSaleBatch,
} from '@/lib/storage';
import { getSaleName } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

type Tab = 'list' | 'metrics' | 'users' | 'archived';

function MainApp() {
  const { currentUser, isLoading } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Vista activa: por defecto siempre la lista de pedidos
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [batches, setBatches] = useState<SaleBatch[]>([]);
  const [currentSaleNumber, setCurrentSaleNumber] = useState(1);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isClosingSale, setIsClosingSale] = useState(false);

  const refreshOrders = useCallback(async () => {
    const [data, saleBatches, saleNum] = await Promise.all([
      getOrders(),
      getSalesBatches(),
      getCurrentSaleNumber(),
    ]);
    setOrders(deduplicateOrders(data));
    setBatches(saleBatches);
    setCurrentSaleNumber(saleNum);
    setIsLoadingOrders(false);
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      refreshOrders();
    };

    window.addEventListener('colada_orders_updated', handleStorageUpdate);
    window.addEventListener('colada_sales_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // La carga inicial se dispara fuera del cuerpo síncrono del efecto
    const initialLoad = window.requestAnimationFrame(handleStorageUpdate);

    return () => {
      window.cancelAnimationFrame(initialLoad);
      window.removeEventListener('colada_orders_updated', handleStorageUpdate);
      window.removeEventListener('colada_sales_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [refreshOrders]);

  // Solo se muestra la venta activa; el resto queda archivado
  const activeSaleOrders = useMemo(
    () => orders.filter((o) => (o.sale_number || 1) === currentSaleNumber),
    [orders, currentSaleNumber]
  );

  const activeBatch = useMemo(
    () => batches.find((b) => b.sale_number === currentSaleNumber),
    [batches, currentSaleNumber]
  );

  const currentSaleName = activeBatch?.name || getSaleName(currentSaleNumber);

  const metrics: SalesMetrics = useMemo(
    () => calculateMetrics(activeSaleOrders),
    [activeSaleOrders]
  );

  // Al crear un nuevo pedido
  const handleOrderCreated = (newOrder: Order) => {
    const withSale: Order = { ...newOrder, sale_number: newOrder.sale_number || currentSaleNumber };
    setOrders((prev) => deduplicateOrders([withSale, ...prev]));
    setIsAddingOrder(false);
    setEditingOrder(null);
    setActiveTab('list');
  };

  // Al editar un pedido existente
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders((prev) =>
      deduplicateOrders(prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)))
    );
    setIsAddingOrder(false);
    setEditingOrder(null);
    setActiveTab('list');
  };

  // Abrir editor completo
  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setIsAddingOrder(true);
  };

  // Cierre de venta: archiva los pedidos actuales e inicia la siguiente venta en cero
  const handleCloseSale = async () => {
    if (isClosingSale) return;
    setIsClosingSale(true);
    try {
      await closeCurrentSaleBatch(currentSaleNumber, metrics);
      setIsAddingOrder(false);
      setEditingOrder(null);
      await refreshOrders();
      setActiveTab('list');
    } finally {
      setIsClosingSale(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-purple-700 mb-2" />
        <p className="text-xs text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  // Un vendedor nunca debe poder entrar a la pestaña de usuarios ni al historial
  const safeTab: Tab =
    !isAdmin && (activeTab === 'archived' || activeTab === 'users') ? 'list' : activeTab;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Barra de navegación superior */}
      <Navbar
        activeTab={safeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsAddingOrder(false);
          setEditingOrder(null);
        }}
        ordersCount={activeSaleOrders.length}
        currentSaleName={currentSaleName}
      />

      {/* Contenido Principal */}
      <main className="pt-4">
        {isLoadingOrders ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
          </div>
        ) : (
          <>
            {/* Formulario de Crear o Editar Pedido */}
            {isAddingOrder ? (
              <NewOrderForm
                initialOrder={editingOrder}
                onOrderCreated={handleOrderCreated}
                onOrderUpdated={handleOrderUpdated}
                onCancel={() => {
                  setIsAddingOrder(false);
                  setEditingOrder(null);
                }}
              />
            ) : (
              <>
                {/* 1. Lista de Pedidos de la venta activa (Por defecto) */}
                {safeTab === 'list' && (
                  <OrderList
                    orders={activeSaleOrders}
                    onRefresh={refreshOrders}
                    onOpenNewOrder={() => {
                      setEditingOrder(null);
                      setIsAddingOrder(true);
                    }}
                    onEditOrder={handleOpenEdit}
                  />
                )}

                {/* 2. Resumen y Cuadre de Caja de la venta activa */}
                {safeTab === 'metrics' && (
                  <Dashboard
                    metrics={metrics}
                    currentSaleName={currentSaleName}
                    isAdmin={isAdmin}
                    onCloseSale={handleCloseSale}
                  />
                )}

                {/* 3. Historial de Ventas Archivadas (Exclusivo Administrador) */}
                {safeTab === 'archived' && isAdmin && (
                  <ArchivedSales
                    salesBatches={batches}
                    allOrders={orders}
                    currentSaleNumber={currentSaleNumber}
                    onBack={() => setActiveTab('list')}
                    onRefresh={refreshOrders}
                  />
                )}

                {/* 4. Gestión de Usuarios (Exclusivo Administrador) */}
                {safeTab === 'users' && isAdmin && (
                  <UserManagement onBack={() => setActiveTab('list')} />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}