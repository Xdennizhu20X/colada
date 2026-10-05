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
