import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useScanCount} from '../providers/ScanCountProvider';
import {FREE_SCANS, SCANS_BEFORE_RATING} from '../constants/purchases';

const STORAGE_KEY = 'ratingPromptShown';

export function useRatingPrompt() {
  const {scanCount} = useScanCount();
  const [shown, setShown] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    setShown(value === 'true');
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const dismiss = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setShown(true);
  }, []);

  const visible =
    shown === false &&
    scanCount !== null &&
    scanCount >= SCANS_BEFORE_RATING &&
    scanCount < FREE_SCANS;

  return {visible, dismiss};
}
