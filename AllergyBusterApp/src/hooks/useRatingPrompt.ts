import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useInstallAge} from './useInstallAge';
import {RATING_PROMPT_DAY} from '../constants/purchases';

const STORAGE_KEY = 'ratingPromptShown';

export function useRatingPrompt() {
  const {daysSinceInstall} = useInstallAge();
  const [shown, setShown] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      setShown(value === 'true');
    });
  }, []);

  const dismiss = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setShown(true);
  }, []);

  const visible =
    shown === false && daysSinceInstall !== null && daysSinceInstall >= RATING_PROMPT_DAY;

  return {visible, dismiss};
}
