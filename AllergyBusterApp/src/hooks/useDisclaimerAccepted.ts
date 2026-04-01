import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'disclaimerAccepted';

export function useDisclaimerAccepted() {
  const [accepted, setAccepted] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      setAccepted(value === 'true');
    });
  }, []);

  const accept = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setAccepted(true);
  }, []);

  return {accepted, accept};
}
