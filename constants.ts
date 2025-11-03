import type { Category } from './types';

// Le categorie di default ora vengono create da un trigger di Supabase
// quando un nuovo utente si registra. Questa costante non è più la fonte di verità.
export const DEFAULT_CATEGORIES: Category[] = [];

export const CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];