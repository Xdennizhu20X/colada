import { UserProfile } from '@/types';

export const PRICES = {
  HALF_LITER: 2.00,  // $2.00 por medio litro
  LITER: 3.00,       // $3.00 por 1 litro
  BREAD: 0.50,       // $0.50 por figurita de pan
  MIN_LITERS_FOR_DELIVERY: 3, // A partir de 3 litros se habilita o sugiere entrega a domicilio
};

// Único usuario inicial: Administrador Dennis
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-dennis',
    username: 'dennis',
    name: 'Dennis',
    role: 'admin',
    pin: '1234',
  },
];

const SALE_ORDINALS: Record<number, string> = {
  1: 'Primera Venta',
  2: 'Segunda Venta',
  3: 'Tercera Venta',
  4: 'Cuarta Venta',
  5: 'Quinta Venta',
  6: 'Sexta Venta',
  7: 'Séptima Venta',
  8: 'Octava Venta',
  9: 'Novena Venta',
  10: 'Décima Venta',
};

export const getSaleName = (num: number): string => {
  return SALE_ORDINALS[num] || `Venta #${num}`;
};

