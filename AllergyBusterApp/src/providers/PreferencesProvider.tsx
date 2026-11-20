import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {DEFAULT_PREFERENCES, Preferences} from '../types/preferences';
import {loadPreferences, savePreferences} from '../storage/preferencesStore';

interface PreferencesContextValue {
  preferences: Preferences;
  isLoaded: boolean;
  update: (patch: Partial<Preferences>) => Promise<void>;
}

// Default (no provider) = defaults, so components render in isolation/tests.
const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  isLoaded: false,
  update: async () => {},
});

export function PreferencesProvider({children}: {children: React.ReactNode}) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadPreferences().then(p => {
      current.current = p;
      setPreferences(p);
      setIsLoaded(true);
    });
  }, []);

  // Ref holds the latest value so rapid successive updates merge correctly
  // (a setState updater isn't guaranteed to run before the save below).
  const current = useRef<Preferences>(DEFAULT_PREFERENCES);

  const update = useCallback(async (patch: Partial<Preferences>) => {
    const next = {...current.current, ...patch};
    current.current = next;
    setPreferences(next);
    await savePreferences(next);
  }, []);

  const value = useMemo(() => ({preferences, isLoaded, update}), [preferences, isLoaded, update]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
