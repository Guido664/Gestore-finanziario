import React, { useState, useEffect, useMemo } from 'react';
import type { Transaction, Category } from '../types';
import type { Filter } from '../App';
import { GoogleGenAI } from '@google/genai';
import { LightBulbIcon } from './Icons';

// Simple markdown to HTML renderer
const Markdown = ({ content }: { content: string }) => {
  const html = useMemo(() => {
    let htmlContent = content;
    // Bold
    htmlContent = htmlContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Headers
    htmlContent = htmlContent.replace(/^### (.*$)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    htmlContent = htmlContent.replace(/^## (.*$)/g, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
    // Bullets
    htmlContent = htmlContent.replace(/^\* (.*$)/g, '<li class="ml-5 list-disc">$1</li>');
    // Line breaks
    htmlContent = htmlContent.replace(/\n/g, '<br />');

    return htmlContent;
  }, [content]);

  return <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: html }} />;
};

// Custom hook for financial analysis
const useFinancialAnalysis = (transactions: Transaction[], categories: Category[], filter: Filter) => {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFilterDescription = () => {
    if (filter.mode === 'range') {
      if (filter.startDate && filter.endDate) {
        return `dal ${new Date(filter.startDate).toLocaleDateString('it-IT')} al ${new Date(filter.endDate).toLocaleDateString('it-IT')}.`;
      }
      return 'per il periodo personalizzato selezionato.';
    }
    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    if (filter.month === 'all') {
      return `per l'intero anno ${filter.year}.`;
    }
    return `per ${monthNames[filter.month]} ${filter.year}.`;
  };

  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const simplifiedTransactions = transactions.map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.type === 'expense' ? categories.find(c => c.id === t.categoryId)?.name || 'Altro' : 'N/A',
        description: t.description,
      }));

      const prompt = `
        Sei un consulente finanziario esperto. Analizza il seguente elenco di transazioni JSON ${getFilterDescription()}
        Fornisci un'analisi concisa e chiara in italiano, con consigli pratici.
        
        Struttura la tua risposta in formato Markdown come segue:
        ## Riepilogo Finanziario
        * Fai un riassunto generale delle entrate, delle uscite e del saldo netto del periodo.
        
        ## Analisi delle Spese Principali
        * Identifica le 2-3 categorie di spesa più importanti e commentale.
        
        ## Consigli per la Gestione
        * Offri 3 consigli pratici e attuabili per migliorare la gestione delle finanze basandoti sui dati. 
        * Sii specifico, ad esempio, suggerendo di rivedere una categoria di spesa se sembra troppo alta o di notare spese ricorrenti che potrebbero essere ottimizzate.
        * Evita consigli generici non legati ai dati.

        NON includere alcuna intestazione o introduzione prima di "## Riepilogo Finanziario".

        Dati delle transazioni:
        ${JSON.stringify(simplifiedTransactions, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAnalysis(response.text);

    } catch (e) {
      console.error("Errore durante la generazione dell'analisi:", e);
      setError("Si è verificato un errore durante la generazione dell'analisi. Potrebbe esserci un problema con la connessione o la configurazione dell'API.");
    } finally {
      setIsLoading(false);
    }
  };

  return { analysis, isLoading, error, generateAnalysis };
};


interface FinancialAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  filter: Filter;
}

const FinancialAnalysisModal: React.FC<FinancialAnalysisModalProps> = ({ isOpen, onClose, transactions, categories, filter }) => {
  const { analysis, isLoading, error, generateAnalysis } = useFinancialAnalysis(transactions, categories, filter);

  useEffect(() => {
    if (isOpen) {
      generateAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center text-center">
        <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-slate-600 font-semibold">Analisi in corso...</p>
        <p className="mt-1 text-sm text-slate-500">Il consulente AI sta esaminando i tuoi dati.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 pt-16 overflow-y-auto">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 ease-out">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 p-3 rounded-full">
                <LightBulbIcon className="w-8 h-8 text-amber-500" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Analisi Finanziaria AI</h2>
                <p className="text-slate-500">Consigli personalizzati per le tue finanze.</p>
            </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-lg min-h-[250px] flex items-center justify-center">
            {isLoading && <LoadingSpinner />}
            {error && <p className="text-red-600 text-center">{error}</p>}
            {!isLoading && !error && analysis && (
                <Markdown content={analysis} />
            )}
        </div>

        <div className="mt-8 flex justify-end gap-4">
            <button
                type="button"
                onClick={onClose}
                className="bg-white text-slate-700 font-semibold py-2 px-6 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors duration-200"
            >
                Chiudi
            </button>
             <button
                type="button"
                onClick={generateAnalysis}
                disabled={isLoading}
                className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:bg-indigo-300"
            >
                {isLoading ? 'Analizzando...' : 'Rigenera Analisi'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalysisModal;
