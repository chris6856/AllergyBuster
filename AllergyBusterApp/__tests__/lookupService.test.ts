import {httpClient} from '../src/services/http';
import {lookupViaWorker, LookupUnavailableError} from '../src/services/lookupService';
import {getProductByBarcode} from '../src/services/productService';
import * as off from '../src/services/openFoodFacts';
import {cleanIngredientsText, inferCategory} from '../src/utils/productRecord';

jest.mock('../src/services/http', () => ({
  httpClient: {get: jest.fn()},
  offClient: {get: jest.fn()},
  edamamClient: {get: jest.fn()},
}));
jest.mock('../src/constants/config', () => ({
  LOOKUP_URL: 'https://worker.test/lookup',
  EDAMAM_APP_ID: 'x',
  EDAMAM_APP_KEY: 'y',
}));

const mockGet = httpClient.get as jest.Mock;
const ok = (data: unknown) => Promise.resolve({data});

beforeEach(() => jest.resetAllMocks());

// Shapes trimmed from real /lookup responses (local Worker, 2026-11-19).
const DISH_SOAP = {
  code: '0068156986142',
  product_name: 'Citrus Dish Soap',
  product_type: 'product',
  ingredients_text: 'Aqua (filtered water), sodium lauryl sulfate (plant-derived)',
  categories_tags: ['en:Hand Dishwashing Soap', 'en:Liquid-dish-soap'],
};
const SHAMPOO = {
  code: '8001090662231',
  product_name: 'Coconut Milk',
  product_type: 'beauty',
  ingredients_text: 'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine',
  categories_tags: ['en:hair', 'en:shampoos'],
};

describe('lookupViaWorker', () => {
  it('maps an Open Products Facts household record', async () => {
    mockGet.mockReturnValue(ok({found: true, source: 'openproductsfacts', product: DISH_SOAP}));
    const p = await lookupViaWorker('0068156986142');
    expect(p?.source).toBe('openproductsfacts');
    expect(p?.category).toBe('household');
    expect(p?.name).toBe('Citrus Dish Soap');
    expect(p?.completeness.hasIngredients).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('https://worker.test/lookup', expect.objectContaining({params: {barcode: '0068156986142'}}));
  });

  it('maps an Open Beauty Facts record', async () => {
    mockGet.mockReturnValue(ok({found: true, source: 'openbeautyfacts', product: SHAMPOO}));
    const p = await lookupViaWorker('8001090662231');
    expect(p?.source).toBe('openbeautyfacts');
    expect(p?.category).toBe('personal_care');
  });

  it('maps an Edamam record', async () => {
    mockGet.mockReturnValue(ok({
      found: true,
      source: 'edamam',
      product: {foodId: 'f1', label: 'Oat Bar', foodContentsLabel: 'Ingredients: oats; honey; almonds'},
    }));
    const p = await lookupViaWorker('012345678905');
    expect(p?.source).toBe('edamam');
    expect(p?.allergens.declared).toEqual(expect.arrayContaining(['Gluten', 'Tree Nuts']));
    expect(p?.gtin).toBe('0012345678905');
  });

  it('returns null when no database knows the barcode', async () => {
    mockGet.mockReturnValue(ok({found: false, source: null, product: null}));
    await expect(lookupViaWorker('0000000000000')).resolves.toBeNull();
  });

  it('throws LookupUnavailableError on network failure', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));
    await expect(lookupViaWorker('1')).rejects.toBeInstanceOf(LookupUnavailableError);
  });

  it('throws LookupUnavailableError on an unexpected body or unknown source', async () => {
    mockGet.mockReturnValueOnce(ok('<html>error</html>'));
    await expect(lookupViaWorker('1')).rejects.toBeInstanceOf(LookupUnavailableError);
    mockGet.mockReturnValueOnce(ok({found: true, source: 'openpetfoodfacts', product: {}}));
    await expect(lookupViaWorker('1')).rejects.toBeInstanceOf(LookupUnavailableError);
  });
});

describe('getProductByBarcode (Worker first, direct fallback)', () => {
  it('uses the Worker result without calling sources directly', async () => {
    const spy = jest.spyOn(off, 'getProductByBarcode');
    mockGet.mockReturnValue(ok({found: true, source: 'openbeautyfacts', product: SHAMPOO}));
    expect((await getProductByBarcode('8001090662231'))?.source).toBe('openbeautyfacts');
    expect(spy).not.toHaveBeenCalled();
  });

  it('trusts a Worker "not found" (no duplicate direct calls)', async () => {
    const spy = jest.spyOn(off, 'getProductByBarcode');
    mockGet.mockReturnValue(ok({found: false, source: null, product: null}));
    expect(await getProductByBarcode('0000000000000')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls back to direct Open Food Facts when the Worker is down', async () => {
    mockGet.mockRejectedValue(new Error('timeout'));
    const direct = off.normalize({code: '016000275263', product_name: 'Cheerios', ingredients_text: 'oats'}, '016000275263');
    const spy = jest.spyOn(off, 'getProductByBarcode').mockResolvedValue(direct);
    const p = await getProductByBarcode('016000275263');
    expect(spy).toHaveBeenCalledWith('016000275263');
    expect(p?.name).toBe('Cheerios');
  });
});

describe('record clean-up', () => {
  it('decodes HTML entities in ingredient lists', () => {
    expect(cleanIngredientsText('&gt;30% agua, &lt;5% tensioactivo &amp; perfume &#233;')).toBe(
      '>30% agua, <5% tensioactivo & perfume é',
    );
  });

  it('matches category tags regardless of case and spacing', () => {
    expect(inferCategory('product', ['en:Hand Dishwashing Soap'])).toBe('household');
    expect(inferCategory('product', ['en:Laundry Detergent'])).toBe('household');
    expect(inferCategory('product', ['en:Body Lotion'])).toBe('personal_care');
  });
});
