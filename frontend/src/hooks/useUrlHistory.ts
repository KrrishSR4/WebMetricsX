import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'webmetrics_url_history';
const MAX_HISTORY = 10;

export interface HistoryItem {
  url: string;
  lastChecked: string;
  status: 'up' | 'down' | 'degraded' | 'pending';
  responseTime: number | null;
}

export function useUrlHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load URL history:', err);
    }
  }, []);

  // Save to localStorage whenever history changes
  const saveToStorage = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save URL history:', err);
    }
  }, []);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory(prev => {
      // Remove existing entry for same URL
      const filtered = prev.filter(h => h.url !== item.url);
      // Add new item at the beginning
      const updated = [item, ...filtered].slice(0, MAX_HISTORY);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const removeFromHistory = useCallback((url: string) => {
    setHistory(prev => {
      const updated = prev.filter(h => h.url !== url);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
