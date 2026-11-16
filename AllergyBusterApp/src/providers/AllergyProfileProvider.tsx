import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {AllergyProfile, EMPTY_PROFILE} from '../types/profile';
import {loadProfile, saveProfile} from '../storage/profileStore';

interface AllergyProfileContextValue {
  profile: AllergyProfile;
  isLoaded: boolean;
  hasProfile: boolean;
  setAllergens: (keys: string[]) => Promise<void>;
}

// The default value (no provider) behaves as "no profile", so components that
// read the profile still render in isolation, e.g. in tests.
const AllergyProfileContext = createContext<AllergyProfileContextValue>({
  profile: EMPTY_PROFILE,
  isLoaded: false,
  hasProfile: false,
  setAllergens: async () => {},
});

export function AllergyProfileProvider({children}: {children: React.ReactNode}) {
  const [profile, setProfile] = useState<AllergyProfile>(EMPTY_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadProfile().then(p => {
      setProfile(p);
      setIsLoaded(true);
    });
  }, []);

  const setAllergens = useCallback(async (keys: string[]) => {
    const next: AllergyProfile = {allergens: keys, updatedAt: new Date().toISOString()};
    setProfile(next);
    await saveProfile(next);
  }, []);

  const value = useMemo(
    () => ({profile, isLoaded, hasProfile: profile.allergens.length > 0, setAllergens}),
    [profile, isLoaded, setAllergens],
  );

  return (
    <AllergyProfileContext.Provider value={value}>{children}</AllergyProfileContext.Provider>
  );
}

export function useAllergyProfile() {
  return useContext(AllergyProfileContext);
}
