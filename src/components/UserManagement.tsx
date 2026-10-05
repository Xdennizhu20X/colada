'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface UserManagementProps {
  onBack: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onBack }) => {
  const { currentUser, users, addUser, deleteUser } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'vendedor' | 'admin'>('vendedor');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal para confirmación de borrado
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !username.trim() || !pin.trim()) {
      setMessage({ type: 'error', text: 'Completa todos los campos.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      setMessage({ type: 'error', text: `El usuario "${cleanUsername}" ya existe.` });
      return;
    }

    addUser(name.trim(), cleanUsername, pin.trim(), role);

    setName('');
    setUsername('');
    setPin('');
    setRole('vendedor');
    setMessage({ type: 'success', text: `Usuario "${cleanUsername}" creado con éxito.` });

    setTimeout(() => setMessage(null), 3500);
  };

  const promptDeleteUser = (userId: string, userName: string) => {
    if (userId === currentUser?.id) {
      setMessage({ type: 'error', text: 'No puedes eliminar tu propia cuenta de administrador.' });
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    setDeleteModal({
      isOpen: true,
      userId,
      userName,
    });
  };

  return (
    <div className="pb-28 px-4 max-w-xl mx-auto space-y-4">
      {/* Botón Volver */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800 hover:text-purple-950 py-1.5 px-2.5 rounded-xl hover:bg-purple-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Pedidos</span>
        </button>

        <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
          Panel de Administrador
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulario Crear Usuario */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4 text-purple-700" />
          Crear Nuevo Usuario / Vendedor
        </h2>

        <form onSubmit={handleCreateUser} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la persona
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: María Valencia, Carlos López"
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario (Login)
              </label>
              <input
                type="text"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: maria"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN / Contraseña
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Ej: 1234"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rol en el sistema
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('vendedor')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'vendedor'
                    ? 'bg-purple-800 text-white border-purple-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Vendedor</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'admin'
                    ? 'bg-purple-800 text-white border-purple-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Administrador</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-1 py-2.5 px-4 bg-purple-800 hover:bg-purple-900 active:bg-purple-950 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Crear y Habilitar Usuario</span>
          </button>
        </form>
      </div>

      {/* Lista de Usuarios Registrados */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-purple-700" />
          Usuarios Habilitados ({users.length})
        </h3>

        <div className="space-y-2">
          {users.map((u) => {
            const isMe = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {u.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {u.name} {isMe && <span className="text-[10px] text-purple-700 font-normal">(Tú)</span>}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Usuario: <span className="font-semibold text-slate-700">{u.username}</span> • PIN: <span className="font-mono text-slate-700">{u.pin}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>

                  {!isMe && (
                    <button
                      onClick={() => promptDeleteUser(u.id, u.name)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de confirmación para eliminar usuario */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="¿Eliminar Usuario?"
        description={`Se deshabilitará la cuenta de "${deleteModal.userName}". Ya no podrá ingresar a la aplicación.`}
        confirmText="Sí, Eliminar"
        variant="danger"
        onConfirm={() => {
          deleteUser(deleteModal.userId);
          setDeleteModal({ isOpen: false, userId: '', userName: '' });
        }}
        onCancel={() => setDeleteModal({ isOpen: false, userId: '', userName: '' })}
      />
    </div>
  );
};
