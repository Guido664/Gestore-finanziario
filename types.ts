export interface Transaction {
  id: string;
  description: string;
  amount: number;
  categoryId?: string;
  date: string;
  type: 'expense' | 'income';
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  categoryId?: string;
  type: 'expense' | 'income';
  frequency: 'weekly' | 'monthly' | 'annually';
  startDate: string;
  nextDueDate: string;
}
