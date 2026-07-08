import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'scanCount';

export async function incrementScanCount(): Promise<void> {
  const current = await AsyncStorage.getItem(STORAGE_KEY);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  await AsyncStorage.setItem(STORAGE_KEY, String(next));
}

export async function getScanCount(): Promise<number> {
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  return v ? parseInt(v, 10) : 0;
}
