import {useCallback, useEffect, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useInstallAge} from './useInstallAge';
import {TRIAL_DAYS, TRIAL_WARNING_DAY} from '../constants/purchases';

const STORAGE_KEY = 'trialWarningShown';

export function useTrialWarning() {
  const {daysSinceInstall} = useInstallAge();
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
    daysSinceInstall !== null &&
    daysSinceInstall >= TRIAL_WARNING_DAY &&
    daysSinceInstall < TRIAL_DAYS;

  return {visible, dismiss};
}
