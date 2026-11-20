import {runMigrations} from '../src/storage/migrations';
import {setDbForTesting} from '../src/storage/db';
import {
  clearDecision,
  countSavedProducts,
  getSavedProduct,
  listSavedProducts,
  removeProduct,
  saveProduct,
  setDecision,
} from '../src/storage/pantryStore';
import {
  addItem,
  createList,
  deleteList,
  ensureDefaultList,
  finishTrip,
  getItems,
  getLists,
  listsContaining,
  setChecked,
  setQuantity,
} from '../src/storage/listStore';
import {loadPreferences, savePreferences} from '../src/storage/preferencesStore';
import {DEFAULT_PREFERENCES} from '../src/types/preferences';
import {productContentHash} from '../src/utils/contentHash';
import {ProductRecord} from '../src/types/product';
import {nodeDb} from '../test-utils/nodeSqlite';

jest.mock('@op-engineering/op-sqlite', () => ({open: jest.fn()}));

function product(over: Partial<ProductRecord> = {}): ProductRecord {
  return {
    id: '016000275263',
    name: 'Cheerios',
    brand: 'General Mills',
    allergens: {declared: ['Gluten'], traces: []},
    ingredientsText: 'Whole grain oats, corn starch, sugar, salt',
    source: 'openfoodfacts',
    gtin: '0016000275263',
    category: 'food',
    categoryTags: [],
    additives: ['en:e340'],
    labels: [],
    ingredientsAnalysis: [],
    novaGroup: 3,
    packaging: [],
    nutrition: null,
    completeness: {hasIngredients: true, hasAllergenTags: false, hasNutrition: false, hasPackaging: false, sourceScore: null},
    sourceUpdatedAt: null,
    fetchedAt: '2026-11-19T00:00:00.000Z',
    ...over,
  };
}

beforeEach(async () => {
  const db = nodeDb();
  await runMigrations(db);
  setDbForTesting(db);
});
afterAll(() => setDbForTesting(null));

describe('productContentHash', () => {
  it('ignores metadata and formatting, but not ingredients', () => {
    const base = productContentHash(product());
    expect(productContentHash(product({name: 'Cheerios Family Size', fetchedAt: 'x', novaGroup: 4}))).toBe(base);
    expect(productContentHash(product({ingredientsText: 'WHOLE GRAIN OATS,  corn starch; sugar. salt'}))).toBe(base);
    expect(productContentHash(product({ingredientsText: 'Whole grain oats, corn starch, sugar, salt, almonds'}))).not.toBe(base);
    expect(productContentHash(product({allergens: {declared: ['Gluten'], traces: ['Peanuts']}}))).not.toBe(base);
  });
});

describe('pantryStore', () => {
  it('saves a product and reads it back', async () => {
    const r = await saveProduct(product());
    expect(r).toMatchObject({gtin: '0016000275263', isNew: true, changed: false});
    const saved = await getSavedProduct('0016000275263');
    expect(saved?.name).toBe('Cheerios');
    expect(saved?.latest.additives).toEqual(['en:e340']);
    expect(saved?.approval).toBeNull();
    expect(saved?.recheckNeeded).toBe(false);
  });

  it('refuses products without a barcode', async () => {
    await expect(saveProduct(product({gtin: null}))).rejects.toThrow(/barcode/);
  });

  it('does not add a snapshot when nothing changed', async () => {
    const a = await saveProduct(product());
    const b = await saveProduct(product({name: 'Renamed'}));
    expect(b.snapshotId).toBe(a.snapshotId);
    expect(b.changed).toBe(false);
    expect((await getSavedProduct('0016000275263'))?.name).toBe('Renamed');
  });

  it('flags "recheck needed" when ingredients change after a decision, keeping the decision', async () => {
    await saveProduct(product());
    await setDecision('0016000275263', 'approved', 'kids like it');
    expect((await getSavedProduct('0016000275263'))?.recheckNeeded).toBe(false);

    const r = await saveProduct(product({ingredientsText: 'oats, sugar, salt, may contain peanuts', allergens: {declared: ['Gluten'], traces: ['Peanuts']}}));
    expect(r.changed).toBe(true);
    const saved = await getSavedProduct('0016000275263');
    expect(saved?.approval).toMatchObject({status: 'approved', note: 'kids like it'});
    expect(saved?.recheckNeeded).toBe(true);
    expect(saved?.latest.allergens.traces).toEqual(['Peanuts']);

    // Re-confirming the decision clears the flag.
    await setDecision('0016000275263', 'approved');
    expect((await getSavedProduct('0016000275263'))?.recheckNeeded).toBe(false);
  });

  it('filters by status, category and recheck', async () => {
    await saveProduct(product());
    await saveProduct(product({gtin: '0068156986142', name: 'Dish Soap', category: 'household', ingredientsText: 'aqua'}));
    await saveProduct(product({gtin: '8001090662231', name: 'Shampoo', category: 'personal_care', ingredientsText: 'aqua, sls'}));
    await setDecision('0016000275263', 'approved');
    await setDecision('0068156986142', 'avoid');

    expect((await listSavedProducts()).map(p => p.name)).toEqual(['Cheerios', 'Dish Soap', 'Shampoo']);
    expect((await listSavedProducts({status: 'approved'})).map(p => p.name)).toEqual(['Cheerios']);
    expect((await listSavedProducts({status: 'none'})).map(p => p.name)).toEqual(['Shampoo']);
    expect((await listSavedProducts({category: 'household'})).map(p => p.name)).toEqual(['Dish Soap']);
    expect(await listSavedProducts({recheckOnly: true})).toEqual([]);
    expect(await countSavedProducts()).toBe(3);
  });

  it('can clear a decision and remove a product', async () => {
    await saveProduct(product());
    await setDecision('0016000275263', 'avoid');
    await clearDecision('0016000275263');
    expect((await getSavedProduct('0016000275263'))?.approval).toBeNull();
    await removeProduct('0016000275263');
    expect(await getSavedProduct('0016000275263')).toBeNull();
  });

  it('requires the product to be saved before deciding', async () => {
    await expect(setDecision('0000000000000', 'approved')).rejects.toThrow(/Save the product/);
  });
});

describe('listStore', () => {
  it('creates a default list once', async () => {
    const a = await ensureDefaultList();
    const b = await ensureDefaultList();
    expect(a).toBe(b);
    expect((await getLists()).map(l => l.name)).toEqual(['My Shopping List']);
  });

  it('adds products and free-text items; repeated product increases quantity', async () => {
    await saveProduct(product());
    await setDecision('0016000275263', 'approved');
    const list = await ensureDefaultList();
    const first = await addItem(list, {gtin: '0016000275263', label: 'Cheerios'});
    const again = await addItem(list, {gtin: '0016000275263', label: 'Cheerios', quantity: 2});
    await addItem(list, {label: 'Bananas'});
    expect(again).toBe(first);

    const items = await getItems(list);
    expect(items.map(i => [i.label, i.quantity, i.approvalStatus])).toEqual([
      ['Cheerios', 3, 'approved'],
      ['Bananas', 1, null],
    ]);
    expect(await listsContaining('0016000275263')).toEqual([list]);
  });

  it('shows recheck on list items when the product changed', async () => {
    await saveProduct(product());
    await setDecision('0016000275263', 'approved');
    const list = await ensureDefaultList();
    await addItem(list, {gtin: '0016000275263', label: 'Cheerios'});
    await saveProduct(product({ingredientsText: 'oats, almonds'}));
    expect((await getItems(list))[0].recheckNeeded).toBe(true);
  });

  it('orders checked items last and finishes a trip', async () => {
    const list = await ensureDefaultList();
    const a = await addItem(list, {label: 'Milk'});
    await addItem(list, {label: 'Bread'});
    await setChecked(a, true);
    expect((await getItems(list)).map(i => [i.label, i.checked])).toEqual([['Bread', false], ['Milk', true]]);
    expect((await getLists())[0]).toMatchObject({itemCount: 2, uncheckedCount: 1});

    await finishTrip(list, 'reset');
    expect((await getItems(list)).every(i => !i.checked)).toBe(true);
    await setChecked(a, true);
    await finishTrip(list, 'remove');
    expect((await getItems(list)).map(i => i.label)).toEqual(['Bread']);
  });

  it('quantity 0 removes the item; deleting a list removes its items', async () => {
    const list = await createList('Costco');
    const id = await addItem(list, {label: 'Rice'});
    await setQuantity(id, 0);
    expect(await getItems(list)).toEqual([]);
    await addItem(list, {label: 'Beans'});
    await deleteList(list);
    expect(await getItems(list)).toEqual([]);
  });

  it('keeps the item label when the saved product is removed', async () => {
    await saveProduct(product());
    const list = await ensureDefaultList();
    await addItem(list, {gtin: '0016000275263', label: 'Cheerios'});
    await removeProduct('0016000275263');
    const [item] = await getItems(list);
    expect(item).toMatchObject({label: 'Cheerios', gtin: null, approvalStatus: null});
  });
});

describe('preferencesStore', () => {
  it('returns defaults, saves, and fills missing keys with defaults', async () => {
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
    await savePreferences({...DEFAULT_PREFERENCES, fragrance: true, sodium: {enabled: true, limitPerServingMg: 300}});
    const p = await loadPreferences();
    expect(p.fragrance).toBe(true);
    expect(p.sodium).toEqual({enabled: true, limitPerServingMg: 300});
    expect(p.addedSugar).toEqual(DEFAULT_PREFERENCES.addedSugar);
  });

  it('clamps out-of-range limits', async () => {
    await savePreferences({...DEFAULT_PREFERENCES, sodium: {enabled: true, limitPerServingMg: 999999}});
    expect((await loadPreferences()).sodium.limitPerServingMg).toBe(5000);
  });
});
