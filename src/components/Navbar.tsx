'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, BarChart3, LogOut, CupSoda, User, Users } from 'lucide-react';

interface NavbarProps {
  activeTab: 'list' | 'metrics' | 'users';
  setActiveTab: (tab: 'list' | 'metrics' | 'users') => void;
  ordersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, ordersCount }) => {
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-purple-900 text-white shadow-sm border-b border-purple-800">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Marca & Vendedor */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-800 flex items-center justify-center text-purple-200">
            <CupSoda className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-none">
              Colada Morada
            </h1>
            <p className="text-[11px] text-purple-200 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-purple-300" />
              <span>{currentUser?.name}</span>
            </p>
          </div>
        </div>

        {/* Pestañas & Acciones */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-purple-950/40 p-1 rounded-xl border border-purple-800">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'list'
                  ? 'bg-purple-800 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Pedidos</span>
              {ordersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-purple-700 text-purple-100 text-[10px] font-bold rounded-full">
                  {ordersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'metrics'
                  ? 'bg-purple-800 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Resumen</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab('users')}
                title="Gestión de Usuarios"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-purple-800 text-white shadow-sm'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Equipo</span>
              </button>
            )}
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 text-purple-300 hover:text-white hover:bg-purple-800 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
