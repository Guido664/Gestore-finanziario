import React, { useMemo, useState } from 'react';
import type { Transaction, Category } from '../types';
import type { Filter } from '../App';
import CategoryPieChart from './CategoryPieChart';
import StatCard from './StatCard';
import TrendChart from './TrendChart';
import { WalletIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ScaleIcon } from './Icons';

interface DashboardProps {
  initialBalance: number;
  transactions: Transaction[]; // Tutte le transazioni per il saldo totale
  filteredTransactions: Transaction[]; // Transazioni del periodo selezionato
  categories: Category[];
  filter: Filter;
}

const Dashboard: React.FC<DashboardProps> = ({ initialBalance, transactions, filteredTransactions, categories, filter }) => {
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);

  const { periodIncome, periodExpenses, expenseDataByCategory } = useMemo(() => {
    let periodIncome = 0;
    let periodExpenses = 0;
    const spendingMap = new Map<string, number>();

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        periodIncome += t.amount;
      } else { // expense
        periodExpenses += t.amount;
        const categoryId = t.categoryId || 'other';
        spendingMap.set(categoryId, (spendingMap.get(categoryId) || 0) + t.amount);
      }
    });
    
    const expenseDataByCategory = Array.from(spendingMap.entries()).map(([categoryId, amount]) => ({
      categoryId,
      amount,
    }));

    return { periodIncome, periodExpenses, expenseDataByCategory };
  }, [filteredTransactions]);

  const { totalIncome, totalExpenses } = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    });
    return { totalIncome, totalExpenses };
  }, [transactions]);


  const currentBalance = initialBalance + totalIncome - totalExpenses;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getChartTitle = () => {
    if (filter.mode === 'range') {
        if (filter.startDate && filter.endDate) {
            const start = new Date(filter.startDate).toLocaleDateString('it-IT');
            const end = new Date(filter.endDate).toLocaleDateString('it-IT');
            return `Spese dal ${start} al ${end}`;
        }
        if (filter.startDate) {
            const start = new Date(filter.startDate).toLocaleDateString('it-IT');
            return `Spese dal ${start}`;
        }
        if (filter.endDate) {
            const end = new Date(filter.endDate).toLocaleDateString('it-IT');
            return `Spese fino al ${end}`;
        }
        return `Riepilogo Spese`;
    }

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    if (filter.month === 'all') {
      return `Spese del ${filter.year}`;
    }
    return `Spese di ${monthNames[filter.month]} ${filter.year}`;
  }
  
  const isAnnualView = filter.mode === 'month' && filter.month === 'all';
  const netBalance = periodIncome - periodExpenses;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isAnnualView ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            <StatCard 
              title="Saldo Attuale" 
              value={isBalanceVisible ? formatCurrency(currentBalance) : '€ ****,**'} 
              icon={<WalletIcon className="w-8 h-8 text-blue-500" />}
              onIconClick={() => setIsBalanceVisible(prev => !prev)}
            />
            <StatCard 
              title={isAnnualView ? "Entrate Annuali" : "Entrate del Periodo"} 
              value={formatCurrency(periodIncome)} 
              icon={<ArrowTrendingUpIcon className="w-8 h-8 text-green-500" />} 
            />
            <StatCard 
              title={isAnnualView ? "Uscite Annuali" : "Uscite del Periodo"} 
              value={formatCurrency(periodExpenses)} 
              icon={<ArrowTrendingDownIcon className="w-8 h-8 text-red-500" />} 
            />
            {isAnnualView && (
              <StatCard 
                title="Saldo Netto Annuo" 
                value={formatCurrency(netBalance)} 
                icon={<ScaleIcon className="w-8 h-8 text-indigo-500" />}
                valueClassName={netBalance >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            )}
          </div>
      </div>
      <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-md h-[320px]">
        <TrendChart data={filteredTransactions} filter={filter} />
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md h-[320px]">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">{getChartTitle()}</h3>
        <CategoryPieChart data={expenseDataByCategory} categories={categories} />
      </div>
    </div>
  );
};

export default Dashboard;