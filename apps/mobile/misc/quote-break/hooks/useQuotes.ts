import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQuotes } from '../utils/screenTime';

const STORAGE_KEY = 'qb:quotes';

export interface Quote {
  id: string;
  text: string;
}

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const loaded: Quote[] = raw ? JSON.parse(raw) : [];
        setQuotes(loaded);
        syncQuotes(loaded.map((q) => q.text));
      } catch {
        // ignore malformed storage
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Quote[]) => {
    setQuotes(next);
    syncQuotes(next.map((q) => q.text));
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const addQuote = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const quote: Quote = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
        text: trimmed,
      };
      persist([quote, ...quotes]);
    },
    [quotes, persist]
  );

  const deleteQuote = useCallback(
    (id: string) => {
      persist(quotes.filter((q) => q.id !== id));
    },
    [quotes, persist]
  );

  return { quotes, isLoading, addQuote, deleteQuote };
}
