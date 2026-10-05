'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2, Info, Plus } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'purple' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'purple',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 transform transition-all animate-scaleUp">
        {/* Ícono según variante */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-100 text-rose-700'
                : variant === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {variant === 'danger' && <Trash2 className="w-5 h-5" />}
            {variant === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {variant === 'purple' && <Info className="w-5 h-5" />}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <p className="text-xs text-slate-600 leading-relaxed mb-5">
          {description}
        </p>

        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-all text-center"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 text-center ${
              variant === 'danger'
                ? 'bg-rose-700 hover:bg-rose-800'
                : variant === 'success'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-purple-800 hover:bg-purple-900'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
