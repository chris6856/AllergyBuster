import {ALLERGEN_KEYWORDS} from '../constants/allergens';
import {AllergyProfile, EMPTY_PROFILE} from '../types/profile';
import {getDb} from './db';

// 1.2 uses a single profile. The schema supports more for the family plan.
export const PRIMARY_PROFILE_ID = 'primary';

export async function loadProfile(): Promise<AllergyProfile> {
  try {
    const db = await getDb();
    const {rows: profileRows} = await db.execute(
      'SELECT updated_at FROM profile WHERE id = ?',
      [PRIMARY_PROFILE_ID],
    );
    if (profileRows.length === 0) {
      return EMPTY_PROFILE;
    }
    const {rows} = await db.execute(
      'SELECT allergen_key FROM profile_allergen WHERE profile_id = ?',
      [PRIMARY_PROFILE_ID],
    );
    const allergens = rows
      .map(r => String(r.allergen_key))
      .filter(k => k in ALLERGEN_KEYWORDS);
    const updatedAt = profileRows[0].updated_at;
    return {allergens, updatedAt: typeof updatedAt === 'string' ? updatedAt : null};
  } catch {
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(profile: AllergyProfile): Promise<void> {
  const db = await getDb();
  const now = profile.updatedAt ?? new Date().toISOString();
  await db.transaction(async tx => {
    await tx.execute(
      `INSERT INTO profile (id, name, is_primary, created_at, updated_at)
       VALUES (?, 'Me', 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
      [PRIMARY_PROFILE_ID, now, now],
    );
    await tx.execute('DELETE FROM profile_allergen WHERE profile_id = ?', [PRIMARY_PROFILE_ID]);
    for (const key of profile.allergens) {
      await tx.execute(
        'INSERT INTO profile_allergen (profile_id, allergen_key) VALUES (?, ?)',
        [PRIMARY_PROFILE_ID, key],
      );
    }
  });
}
