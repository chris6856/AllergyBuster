import {getProductByBarcode} from '../src/services/productService';
import * as off from '../src/services/openFoodFacts';
import * as edamam from '../src/services/edamam';
import {ProductRecord} from '../src/types/product';

jest.mock('../src/services/openFoodFacts');
jest.mock('../src/services/edamam');

const mockOff = off.getProductByBarcode as jest.MockedFunction<typeof off.getProductByBarcode>;
const mockEdamam = edamam.getProductByBarcode as jest.MockedFunction<typeof edamam.getProductByBarcode>;

function record(source: ProductRecord['source'], withIngredients: boolean): ProductRecord {
  return {
    id: '016000275263',
    name: `${source} product`,
    brand: '',
    allergens: {declared: [], traces: []},
    ingredientsText: withIngredients ? 'oats, sugar' : '',
    source,
    gtin: '0016000275263',
    category: 'food',
    categoryTags: [],
    additives: [],
    labels: [],
    ingredientsAnalysis: [],
    novaGroup: null,
    packaging: [],
    nutrition: null,
    completeness: {
      hasIngredients: withIngredients,
      hasAllergenTags: false,
      hasNutrition: false,
      hasPackaging: false,
      sourceScore: null,
    },
    sourceUpdatedAt: null,
    fetchedAt: '2026-11-16T00:00:00.000Z',
  };
}

beforeEach(() => jest.resetAllMocks());

describe('getProductByBarcode fallback', () => {
  it('returns OFF directly when it has ingredients (no Edamam call)', async () => {
    mockOff.mockResolvedValue(record('openfoodfacts', true));
    expect((await getProductByBarcode('1'))?.source).toBe('openfoodfacts');
    expect(mockEdamam).not.toHaveBeenCalled();
  });

  it('prefers Edamam when OFF has no ingredients but Edamam does', async () => {
    mockOff.mockResolvedValue(record('openfoodfacts', false));
    mockEdamam.mockResolvedValue(record('edamam', true));
    expect((await getProductByBarcode('1'))?.source).toBe('edamam');
  });

  it('keeps the OFF record when neither source has ingredients', async () => {
    mockOff.mockResolvedValue(record('openfoodfacts', false));
    mockEdamam.mockResolvedValue(null);
    const p = await getProductByBarcode('1');
    expect(p?.source).toBe('openfoodfacts');
    expect(p?.completeness.hasIngredients).toBe(false);
  });

  it('keeps the OFF record when Edamam errors', async () => {
    mockOff.mockResolvedValue(record('openfoodfacts', false));
    mockEdamam.mockRejectedValue(new Error('network'));
    expect((await getProductByBarcode('1'))?.source).toBe('openfoodfacts');
  });

  it('prefers OFF over an Edamam record that also lacks ingredients', async () => {
    mockOff.mockResolvedValue(record('openfoodfacts', false));
    mockEdamam.mockResolvedValue(record('edamam', false));
    expect((await getProductByBarcode('1'))?.source).toBe('openfoodfacts');
  });

  it('uses Edamam when OFF fails', async () => {
    mockOff.mockRejectedValue(new Error('network'));
    mockEdamam.mockResolvedValue(record('edamam', true));
    expect((await getProductByBarcode('1'))?.source).toBe('edamam');
  });

  it('returns null only when neither source knows the barcode', async () => {
    mockOff.mockResolvedValue(null);
    mockEdamam.mockResolvedValue(null);
    expect(await getProductByBarcode('1')).toBeNull();
  });
});
