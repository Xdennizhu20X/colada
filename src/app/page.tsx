'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/LoginForm';
import { Navbar } from '@/components/Navbar';
import { NewOrderForm } from '@/components/NewOrderForm';
import { OrderList } from '@/components/OrderList';
import { Dashboard } from '@/components/Dashboard';
import { UserManagement } from '@/components/UserManagement';
import { Order, SalesMetrics } from '@/types';
import { getOrders, calculateMetrics, deduplicateOrders } from '@/lib/storage';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { currentUser, isLoading } = useAuth();

  // Vista activa: por defecto siempre la lista de pedidos
  const [activeTab, setActiveTab] = useState<'list' | 'metrics' | 'users'>('list');
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const refreshOrders = useCallback(async () => {
    const data = await getOrders();
    setOrders(deduplicateOrders(data));
    setIsLoadingOrders(false);
  }, []);

  useEffect(() => {
    refreshOrders();

    const handleStorageUpdate = () => {
      refreshOrders();
    };

    window.addEventListener('colada_orders_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('colada_orders_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [refreshOrders]);

  // Al crear un nuevo pedido
  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => deduplicateOrders([newOrder, ...prev]));
    setIsAddingOrder(false);
    setEditingOrder(null);
    setActiveTab('list');
  };

  // Al editar un pedido existente
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders((prev) => deduplicateOrders(prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))));
    setIsAddingOrder(false);
    setEditingOrder(null);
    setActiveTab('list');
  };

  // Abrir editor completo
  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setIsAddingOrder(true);
  };

  const metrics: SalesMetrics = calculateMetrics(orders);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Barra de navegación superior */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsAddingOrder(false);
          setEditingOrder(null);
        }}
        ordersCount={orders.length}
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
                {/* 1. Lista de Pedidos (Por defecto) */}
                {activeTab === 'list' && (
                  <OrderList
                    orders={orders}
                    onRefresh={refreshOrders}
                    onOpenNewOrder={() => {
                      setEditingOrder(null);
                      setIsAddingOrder(true);
                    }}
                    onEditOrder={handleOpenEdit}
                  />
                )}

                {/* 2. Resumen y Cuadre de Caja */}
                {activeTab === 'metrics' && (
                  <Dashboard metrics={metrics} />
                )}

                {/* 3. Gestión de Usuarios (Exclusivo Administrador) */}
                {activeTab === 'users' && (
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
