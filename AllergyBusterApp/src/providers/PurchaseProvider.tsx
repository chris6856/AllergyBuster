import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useIAP, type Product} from 'react-native-iap';
import {LIFETIME_UNLOCK_SKU} from '../constants/purchases';

const STORAGE_KEY = 'isPurchased';

interface PurchaseContextValue {
  isPurchased: boolean;
  isLoading: boolean;
  product: Product | null;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
  error: string | null;
}

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({children}: {children: React.ReactNode}) {
  const [cachedPurchased, setCachedPurchased] = useState<boolean | null>(null); // null = loading from storage
  const [error, setError] = useState<string | null>(null);

  const markPurchased = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setCachedPurchased(true);
  }, []);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    availablePurchases,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: async purchase => {
      try {
        await finishTransaction({purchase, isConsumable: false});
        await markPurchased();
      } catch {
        setError('We could not confirm your purchase. Please try restoring purchases.');
      }
    },
    onPurchaseError: purchaseError => {
      setError(purchaseError.message || 'Purchase failed. Please try again.');
    },
  });

  // Fast local cache so the paywall can render its unlocked state immediately,
  // before the store connection round-trip finishes.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      setCachedPurchased(value === 'true');
    });
  }, []);

  useEffect(() => {
    if (connected) {
      fetchProducts({skus: [LIFETIME_UNLOCK_SKU], type: 'in-app'});
      getAvailablePurchases();
    }
  }, [connected, fetchProducts, getAvailablePurchases]);

  // Reinstalls / new devices: the store remembers non-consumable purchases
  // even when our local AsyncStorage cache doesn't.
  useEffect(() => {
    if (availablePurchases.some(p => p.productId === LIFETIME_UNLOCK_SKU)) {
      markPurchased();
    }
  }, [availablePurchases, markPurchased]);

  const purchase = useCallback(async () => {
    setError(null);
    try {
      await requestPurchase({
        request: {
          apple: {sku: LIFETIME_UNLOCK_SKU},
          google: {skus: [LIFETIME_UNLOCK_SKU]},
        },
        type: 'in-app',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
    }
  }, [requestPurchase]);

  const restore = useCallback(async () => {
    setError(null);
    try {
      await getAvailablePurchases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore purchases.');
    }
  }, [getAvailablePurchases]);

  const product = products.find(p => p.id === LIFETIME_UNLOCK_SKU) ?? null;

  const value: PurchaseContextValue = {
    isPurchased: cachedPurchased === true,
    isLoading: cachedPurchased === null,
    product,
    purchase,
    restore,
    error,
  };

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchase() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) {
    throw new Error('usePurchase must be used within a PurchaseProvider');
  }
  return ctx;
}
