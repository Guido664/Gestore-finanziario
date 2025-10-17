import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Transaction, Category, RecurringTransaction } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/AddTransactionForm';
import ManageCategoriesModal from './components/ManageCategoriesModal';
import ManageRecurringTransactionsModal from './components/ManageRecurringTransactionsModal';
import TransactionFilter from './components/TransactionFilter';
import SearchBar from './components/SearchBar';
import { PlusIcon, TagIcon, BanknotesIcon, UserCircleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowPathIcon, DatabaseIcon, ExclamationTriangleIcon, TrashIcon } from './components/Icons';

export type Filter = {
  mode: 'month' | 'range';
  month: number | 'all';
  year: number;
  startDate: string | null;
  endDate: string | null;
};

const App: React.FC = () => {
  const [isAddTransactionModalOpen, setAddTransactionModalOpen] = useState(false);
  const [isCategoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [isRecurringModalOpen, setRecurringModalOpen] = useState(false);
  const [isInitialBalanceModalOpen, setInitialBalanceModalOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isDeleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingRecurringId, setDeletingRecurringId] = useState<string | null>(null);

  const [initialBalanceText, setInitialBalanceText] = useState('0');
  const initialBalanceInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  const [filter, setFilter] = useState<Filter>({
    mode: 'month',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: null,
    endDate: null,
  });

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageUsage, setStorageUsage] = useState('');

  const [initialBalance, setInitialBalance] = useState<number>(() => {
    const savedBalance = localStorage.getItem('initialBalance');
    return savedBalance ? JSON.parse(savedBalance) : 0;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const savedCategories = localStorage.getItem('categories');
    return savedCategories ? JSON.parse(savedCategories) : DEFAULT_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
      try {
        const parsed = JSON.parse(savedTransactions);
        if (Array.isArray(parsed)) {
          return parsed.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      } catch (e) {
        console.error("Errore nel parsing delle transazioni da localStorage", e);
        return [];
      }
    }
    return [];
  });

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    const saved = localStorage.getItem('recurringTransactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    years.add(new Date().getFullYear());
// FIX: Added explicit types to the sort callback to prevent a potential type inference issue.
    return Array.from(years).sort((a: number, b: number) => b - a);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    // 1. Filter by date
    const dateFiltered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (filter.mode === 'month') {
        const transactionYear = transactionDate.getFullYear();
        if (transactionYear !== filter.year) return false;
        if (filter.month === 'all') return true;
        const transactionMonth = transactionDate.getMonth();
        return transactionMonth === filter.month;
      }
      if (filter.mode === 'range') {
        const txTime = transactionDate.getTime();
        if (filter.startDate) {
          const startTime = new Date(filter.startDate).getTime();
          if (txTime < startTime) return false;
        }
        if (filter.endDate) {
          const endOfDay = new Date(filter.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          const endTime = endOfDay.getTime();
          if (txTime > endTime) return false;
        }
        return true;
      }
      return true;
    });
    
    // 2. Filter by type
    const typeFiltered = typeFilter === 'all'
      ? dateFiltered
      : dateFiltered.filter(t => t.type === typeFilter);

    // 3. Filter by search query
    if (!searchQuery) {
      return typeFiltered;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return typeFiltered.filter(t => {
      const descriptionMatch = t.description.toLowerCase().includes(lowerCaseQuery);
      if (descriptionMatch) return true;

      if (t.type === 'expense') {
        const category = categories.find(c => c.id === t.categoryId);
        if (category && category.name.toLowerCase().includes(lowerCaseQuery)) {
          return true;
        }
      }
      return false;
    });
  }, [transactions, filter, typeFilter, searchQuery, categories]);

  const recurringTransactionToDelete = useMemo(() => {
    if (!deletingRecurringId) return null;
    return recurringTransactions.find(rt => rt.id === deletingRecurringId);
  }, [deletingRecurringId, recurringTransactions]);

  // Generate recurring transactions on load
  useEffect(() => {
    const storedRecurring = localStorage.getItem('recurringTransactions');
    const recurring: RecurringTransaction[] = storedRecurring ? JSON.parse(storedRecurring) : [];
    if (recurring.length === 0) return;

    const today = new Date();
    const newTransactions: Transaction[] = [];
    let hasChanges = false;

    const updatedRecurringTransactions = recurring.map(rt => {
      const newRt = { ...rt };
      let nextDueDate = new Date(newRt.nextDueDate);
      
      while (nextDueDate <= today) {
        hasChanges = true;
        newTransactions.push({
          id: crypto.randomUUID(),
          description: newRt.description,
          amount: newRt.amount,
          type: newRt.type,
          categoryId: newRt.categoryId,
          date: nextDueDate.toISOString(),
        });

        switch (newRt.frequency) {
          case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
          case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
          case 'annually': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
        }
        newRt.nextDueDate = nextDueDate.toISOString();
      }
      return newRt;
    });

    if (hasChanges) {
      setTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setRecurringTransactions(updatedRecurringTransactions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const savedBalance = localStorage.getItem('initialBalance');
    if (savedBalance === null) {
      setInitialBalanceModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
            setProfileMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isInitialBalanceModalOpen) {
      setInitialBalanceText(String(initialBalance));
      setTimeout(() => {
        initialBalanceInputRef.current?.select();
      }, 0);
    }
  }, [isInitialBalanceModalOpen, initialBalance]);

  useEffect(() => {
    localStorage.setItem('initialBalance', JSON.stringify(initialBalance));
  }, [initialBalance]);
  
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  useEffect(() => {
    const keys = ['transactions', 'categories', 'recurringTransactions', 'initialBalance'];
    let totalBytes = 0;
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            totalBytes += new Blob([value]).size;
        }
    });

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    setStorageUsage(formatBytes(totalBytes));
  }, [transactions, categories, recurringTransactions, initialBalance]);

  const handleAddTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
    };
    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const handleUpdateTransaction = useCallback((updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const handleEditTransactionClick = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setAddTransactionModalOpen(true);
  }, []);
  
  const handleOpenAddTransactionModal = () => {
    setEditingTransaction(null);
    setAddTransactionModalOpen(true);
  };

  const handleTransactionFormSubmit = (
    transactionData: Omit<Transaction, 'id'> | Transaction,
    recurring?: { frequency: 'weekly' | 'monthly' | 'annually' }
  ) => {
    if ('id' in transactionData) {
      handleUpdateTransaction(transactionData as Transaction);
    } else {
      handleAddTransaction(transactionData as Omit<Transaction, 'id'>);
    }
    
    if (recurring) {
      const startDate = new Date(transactionData.date);
      startDate.setUTCHours(12, 0, 0, 0);

      const nextDueDate = new Date(startDate);
      switch (recurring.frequency) {
        case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
        case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
        case 'annually': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
      }

      const newRecurringTransaction: RecurringTransaction = {
        id: crypto.randomUUID(),
        description: transactionData.description,
        amount: transactionData.amount,
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        frequency: recurring.frequency,
        startDate: startDate.toISOString(),
        nextDueDate: nextDueDate.toISOString(),
      };
      setRecurringTransactions(prev => [...prev, newRecurringTransaction]);
    }
    
    setAddTransactionModalOpen(false);
    setEditingTransaction(null);
  };

  const handleTransactionFormClose = () => {
    setAddTransactionModalOpen(false);
    setEditingTransaction(null);
  };
  
  const handleSaveInitialBalance = (e: React.FormEvent) => {
    e.preventDefault();
    setInitialBalance(parseFloat(initialBalanceText) || 0);
    setInitialBalanceModalOpen(false);
  };

  const handleAddCategory = (category: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...category, id: crypto.randomUUID() };
    setCategories(prev => [...prev, newCategory]);
  };

  const handleUpdateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa categoria? Le transazioni associate verranno mostrate come "Altro".')) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    }
  };

  const handleUpdateRecurringTransaction = (updated: RecurringTransaction) => {
    setRecurringTransactions(prev => prev.map(rt => rt.id === updated.id ? updated : rt));
  };

  const handleDeleteRecurringTransaction = (id: string) => {
    setDeletingRecurringId(id);
  };

  const confirmDeleteRecurringTransaction = () => {
    if (!deletingRecurringId) return;
    setRecurringTransactions(prev => prev.filter(rt => rt.id !== deletingRecurringId));
    setDeletingRecurringId(null);
  };


  const handleExportCSV = () => {
    const headers = ['ID', 'Descrizione', 'Importo', 'Tipo', 'Categoria', 'Data'];
    
    const rows = transactions.map(t => {
        const category = t.type === 'expense'
            ? categories.find(c => c.id === t.categoryId)?.name || 'Altro'
            : '';

        const data = [
            t.id,
            `"${t.description.replace(/"/g, '""')}"`, // Escape double quotes
            t.amount,
            t.type,
            category,
            new Date(t.date).toLocaleString('it-IT')
        ];
        return data.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `transazioni_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setProfileMenuOpen(false);
  };
  
  const handleImportCSVClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target?.result as string;
            parseCSVAndAddTransactions(csvContent);
        };
        reader.readAsText(file, 'UTF-8');
    };
    input.click();
    setProfileMenuOpen(false);
  };

  const parseCSVAndAddTransactions = (csv: string) => {
    const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let currentField = '';
        let inQuotedField = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (inQuotedField) {
                if (char === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        currentField += '"';
                        i++; 
                    } else {
                        inQuotedField = false;
                    }
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotedField = true;
                } else if (char === ',') {
                    result.push(currentField);
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }
        result.push(currentField);
        return result;
    }

    try {
        const lines = csv.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length <= 1) {
            alert("Il file CSV è vuoto o contiene solo l'intestazione.");
            return;
        }
        
        const header = lines[0].trim();
        if (header !== 'ID,Descrizione,Importo,Tipo,Categoria,Data') {
            alert("Intestazione del file CSV non valida. L'intestazione prevista è: ID,Descrizione,Importo,Tipo,Categoria,Data");
            return;
        }

        const existingIds = new Set(transactions.map(t => t.id));
        const newTransactions: Transaction[] = [];
        const otherCategory = categories.find(c => c.id === 'other');

        for (let i = 1; i < lines.length; i++) {
            const values = parseCsvLine(lines[i]);
            if (values.length !== 6) {
                console.warn(`Riga saltata per numero di colonne non valido: ${lines[i]}`);
                continue;
            }

            const [id, description, amountStr, type, categoryName, dateStr] = values;

            if (!id || existingIds.has(id)) {
                continue; // Skip duplicates or empty IDs
            }

            const amount = parseFloat(amountStr);
            if (isNaN(amount) || (type !== 'expense' && type !== 'income')) {
                console.warn(`Riga saltata per dati non validi: ${lines[i]}`);
                continue;
            }

            let categoryId: string | undefined = undefined;
            if (type === 'expense') {
                const foundCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
                categoryId = foundCategory ? foundCategory.id : otherCategory?.id;
            }

            const [datePart, timePart] = dateStr.split(', ');
            if (!datePart || !timePart) {
                console.warn(`Riga saltata per formato data non valido: ${lines[i]}`);
                continue;
            }
            const [day, month, year] = datePart.split('/');
            const [hours, minutes, seconds] = timePart.split(':');
            const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds));

            if (isNaN(parsedDate.getTime())) {
                console.warn(`Riga saltata per data non valida: ${lines[i]}`);
                continue;
            }
            
            newTransactions.push({
                id,
                description,
                amount,
                type: type as 'expense' | 'income',
                categoryId,
                date: parsedDate.toISOString(),
            });
        }

        if (newTransactions.length > 0) {
            setTransactions(prev => [...prev, ...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            alert(`${newTransactions.length} transazioni importate con successo!`);
        } else {
            alert("Nessuna nuova transazione da importare. Le transazioni potrebbero essere già presenti.");
        }

    } catch (error) {
        console.error("Errore durante l'importazione del CSV:", error);
        alert("Si è verificato un errore durante l'importazione del file. Assicurati che il formato sia corretto.");
    }
  };

  const handleDeleteAllData = () => {
    localStorage.removeItem('transactions');
    localStorage.removeItem('categories');
    localStorage.removeItem('recurringTransactions');
    localStorage.removeItem('initialBalance');
    // Ricarica l'applicazione per resettare lo stato e mostrare la configurazione iniziale
    window.location.reload();
  };


  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Gestore Finanziario
              </h1>
              <p className="text-slate-500 mt-1">Benvenuto, ecco il riepilogo delle tue finanze.</p>
            </div>
            <div className="relative" ref={profileMenuRef}>
              <button
                  onClick={() => setProfileMenuOpen(prev => !prev)}
                  className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  aria-label="Apri menu utente"
                  aria-expanded={isProfileMenuOpen}
              >
                  <UserCircleIcon className="w-8 h-8" />
              </button>
              {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 py-2 z-30">
                      <button
                          onClick={() => { setInitialBalanceModalOpen(true); setProfileMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors duration-150"
                      >
                          <BanknotesIcon className="w-5 h-5 text-slate-500" />
                          Saldo Iniziale
                      </button>
                       <button
                          onClick={() => { setCategoriesModalOpen(true); setProfileMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors duration-150"
                      >
                          <TagIcon className="w-5 h-5 text-slate-500" />
                          Gestisci Categorie
                      </button>
                      <button
                          onClick={() => { setRecurringModalOpen(true); setProfileMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors duration-150"
                      >
                          <ArrowPathIcon className="w-5 h-5 text-slate-500" />
                          Gestisci Ricorrenti
                      </button>
                      <hr className="my-1 border-slate-100"/>
                      <button
                          onClick={handleImportCSVClick}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors duration-150"
                      >
                          <ArrowUpTrayIcon className="w-5 h-5 text-slate-500" />
                          Importa CSV
                      </button>
                      <button
                          onClick={handleExportCSV}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors duration-150"
                      >
                          <ArrowDownTrayIcon className="w-5 h-5 text-slate-500" />
                          Esporta CSV
                      </button>
                      <hr className="my-1 border-slate-100"/>
                      <div className="flex items-center gap-3 px-4 py-3 text-sm text-slate-500">
                          <DatabaseIcon className="w-5 h-5" />
                          <span>Spazio utilizzato: <strong>{storageUsage}</strong></span>
                      </div>
                      <hr className="my-1 border-slate-100"/>
                      <button
                          onClick={() => { setDeleteConfirmationOpen(true); setProfileMenuOpen(false); }}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                          <ExclamationTriangleIcon className="w-5 h-5" />
                          <span>Elimina tutti i dati</span>
                      </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Dashboard 
          initialBalance={initialBalance}
          transactions={transactions}
          filteredTransactions={filteredTransactions}
          categories={categories} 
          filter={filter}
        />

        <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Ultime Transazioni</h2>
                <button
                    onClick={handleOpenAddTransactionModal}
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 w-full sm:w-auto"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Aggiungi Transazione</span>
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
                <div className="w-full md:flex-grow">
                    <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
                </div>
                <div className="w-full md:w-auto flex-shrink-0">
                  <TransactionFilter 
                      filter={filter}
                      onFilterChange={setFilter}
                      availableYears={availableYears}
                      typeFilter={typeFilter}
                      onTypeFilterChange={setTypeFilter}
                  />
                </div>
            </div>
            <TransactionList 
              transactions={filteredTransactions} 
              categories={categories}
              onEdit={handleEditTransactionClick}
            />
        </div>
      </main>

      {isAddTransactionModalOpen && (
        <TransactionForm 
          onClose={handleTransactionFormClose} 
          onSubmit={handleTransactionFormSubmit}
          categories={categories}
          transactionToEdit={editingTransaction}
        />
      )}

      {isCategoriesModalOpen && (
        <ManageCategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={() => setCategoriesModalOpen(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {isRecurringModalOpen && (
        <ManageRecurringTransactionsModal
          isOpen={isRecurringModalOpen}
          onClose={() => setRecurringModalOpen(false)}
          recurringTransactions={recurringTransactions}
          categories={categories}
          onUpdate={handleUpdateRecurringTransaction}
          onDelete={handleDeleteRecurringTransaction}
        />
      )}
      
      {isInitialBalanceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm m-4">
            <h2 className="text-2xl font-bold mb-6">Imposta Saldo Iniziale</h2>
            <p className="text-slate-600 mb-4 text-sm">Inserisci il valore attuale del tuo conto per iniziare a monitorare le tue finanze.</p>
            <form onSubmit={handleSaveInitialBalance}>
              <div>
                <label htmlFor="initial-balance" className="block text-sm font-medium text-slate-700 mb-1">Saldo Iniziale (€)</label>
                <input
                  ref={initialBalanceInputRef}
                  type="number"
                  id="initial-balance"
                  value={initialBalanceText}
                  onChange={(e) => setInitialBalanceText(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Es. 500"
                  step="0.01"
                />
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteConfirmationOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md m-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <h2 id="delete-dialog-title" className="text-xl font-bold text-slate-900">
                Eliminare tutti i dati?
              </h2>
            </div>
            <div id="delete-dialog-description" className="mt-4 text-slate-600 space-y-4">
              <p>
                Sei assolutamente sicuro? Questa azione eliminerà permanentemente <strong>tutti i tuoi dati</strong>, incluse transazioni, categorie, transazioni ricorrenti e il saldo iniziale.
              </p>
              <p className="font-semibold">
                Questa operazione non può essere annullata.
              </p>
            </div>
            <div className="mt-8 flex justify-end gap-4">
               <button
                  type="button"
                  onClick={() => setDeleteConfirmationOpen(false)}
                  className="bg-white text-slate-700 font-semibold py-2 px-6 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-200"
                >
                  Annulla
                </button>
              <button
                onClick={handleDeleteAllData}
                className="bg-red-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sì, elimina tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {recurringTransactionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md m-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-rec-dialog-title" aria-describedby="delete-rec-dialog-description">
            <div className="flex items-start sm:items-center flex-col sm:flex-row gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <h2 id="delete-rec-dialog-title" className="text-xl font-bold text-slate-900">
                Conferma Eliminazione
              </h2>
            </div>
            <div id="delete-rec-dialog-description" className="mt-4 text-slate-600 space-y-4">
              <p>
                Sei sicuro di voler eliminare la transazione ricorrente "<strong>{recurringTransactionToDelete.description}</strong>"?
              </p>
              <p>
                Le transazioni future non verranno più generate. Le transazioni già create in passato non saranno modificate.
              </p>
            </div>
            <div className="mt-8 flex justify-end gap-4">
               <button
                  type="button"
                  onClick={() => setDeletingRecurringId(null)}
                  className="bg-white text-slate-700 font-semibold py-2 px-6 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-200"
                >
                  Annulla
                </button>
              <button
                onClick={confirmDeleteRecurringTransaction}
                className="bg-red-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sì, elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;