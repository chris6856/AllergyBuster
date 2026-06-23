import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'installDate';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function useInstallAge() {
  const [daysSinceInstall, setDaysSinceInstall] = useState<number | null>(null); // null = loading

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async stored => {
      let installDate = stored;
      if (!installDate) {
        installDate = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEY, installDate);
      }
      const elapsedMs = Date.now() - new Date(installDate).getTime();
      setDaysSinceInstall(Math.max(0, Math.floor(elapsedMs / MS_PER_DAY)));
    });
  }, []);

  return {daysSinceInstall, isLoading: daysSinceInstall === null};
}
