export interface AllergyProfile {
  /** Canonical allergen keys (see PROFILE_ALLERGEN_OPTIONS). */
  allergens: string[];
  updatedAt: string | null;
}

export const EMPTY_PROFILE: AllergyProfile = {allergens: [], updatedAt: null};
