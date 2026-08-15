import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'scanCount';

interface ScanCountContextValue {
  scanCount: number | null; // null = loading from storage
  increment: () => Promise<void>;
}

const ScanCountContext = createContext<ScanCountContextValue | null>(null);

export function ScanCountProvider({children}: {children: React.ReactNode}) {
  const [scanCount, setScanCount] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      setScanCount(v ? parseInt(v, 10) : 0);
    });
  }, []);

  const increment = useCallback(async () => {
    setScanCount(prev => {
      const next = (prev ?? 0) + 1;
      AsyncStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return (
    <ScanCountContext.Provider value={{scanCount, increment}}>
      {children}
    </ScanCountContext.Provider>
  );
}

export function useScanCount() {
  const ctx = useContext(ScanCountContext);
  if (!ctx) {
    throw new Error('useScanCount must be used within ScanCountProvider');
  }
  return ctx;
}
