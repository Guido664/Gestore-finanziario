export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  categoryId?: string;
  date: string;
  type: 'expense' | 'income';
}

export interface Category {
  id: string; // Può essere UUID o una stringa predefinita come 'food'
  name: string;
  color: string;
}

export interface RecurringTransaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  categoryId?: string;
  type: 'expense' | 'income';
  frequency: 'weekly' | 'monthly' | 'annually';
  startDate: string;
  nextDueDate: string;
}