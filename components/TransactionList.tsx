import React from 'react';
import type { Transaction, Category } from '../types';
import { PencilSquareIcon, TrashIcon } from './Icons';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
}

const TransactionItem: React.FC<{ 
  transaction: Transaction; 
  categories: Category[];
}> = ({ transaction, categories }) => {
  const isExpense = transaction.type === 'expense';
  
  const category = isExpense 
    ? categories.find(c => c.id === transaction.categoryId) || categories.find(c => c.id === 'other') || { name: 'Altro', color: '#6b7280' }
    : { name: 'Entrata', color: '#10b981' }; // Emerald-500 for income
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };
  
  return (
    <li className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors duration-200 rounded-lg group">
        <div className="flex items-center gap-4">
            <span className="w-3 h-10 rounded-full" style={{ backgroundColor: category.color }}></span>
            <div>
                <p className="font-semibold text-slate-800">{transaction.description}</p>
                <p className="text-sm text-slate-500">{category.name} &bull; {formatDate(transaction.date)}</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <p className={`font-bold text-right text-lg ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
                {isExpense ? '-' : '+'}
                {formatCurrency(transaction.amount)}
            </p>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button data-edit-id={transaction.id} className="text-slate-500 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label={`Edit ${transaction.description}`}>
                    <PencilSquareIcon className="w-5 h-5 pointer-events-none" />
                </button>
            </div>
        </div>
    </li>
  );
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, onEdit }) => {
  
  const handleListClick = (event: React.MouseEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');

    if (!button) return;

    const { editId } = button.dataset;

    if (editId) {
        const transactionToEdit = transactions.find(t => t.id === editId);
        if (transactionToEdit) {
            onEdit(transactionToEdit);
        }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {transactions.length > 0 ? (
        <ul className="divide-y divide-slate-200" onClick={handleListClick}>
          {transactions.map(transaction => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              categories={categories}
            />
          ))}
        </ul>
      ) : (
        <div className="text-center p-10">
          <p className="text-slate-500">Nessuna transazione ancora.</p>
          <p className="text-slate-400 text-sm mt-1">Aggiungi la tua prima transazione per iniziare!</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;