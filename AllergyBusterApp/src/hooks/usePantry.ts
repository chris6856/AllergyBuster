import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ProductCategory, ProductRecord} from '../types/product';
import {ApprovalStatus} from '../types/pantry';
import {
  clearDecision,
  getSavedProduct,
  listSavedProducts,
  removeProduct,
  saveProduct,
  SavedProductFilter,
  setDecision,
} from '../storage/pantryStore';
import {
  addItem,
  createList,
  deleteList,
  ensureDefaultList,
  finishTrip,
  getItems,
  getLists,
  listsContaining,
  removeItem,
  renameList,
  setChecked,
  setQuantity,
} from '../storage/listStore';

// Every pantry/list query lives under one of these roots, so a mutation can
// refresh all screens with a single invalidation.
const PANTRY = ['pantry'] as const;
const LISTS = ['lists'] as const;

export function useSavedProduct(gtin: string | null | undefined) {
  return useQuery({
    queryKey: [...PANTRY, 'product', gtin],
    queryFn: () => getSavedProduct(gtin!),
    enabled: !!gtin,
  });
}

export function useSavedProducts(filter: SavedProductFilter = {}) {
  return useQuery({
    queryKey: [...PANTRY, 'list', filter],
    queryFn: () => listSavedProducts(filter),
  });
}

export function useListsContaining(gtin: string | null | undefined) {
  return useQuery({
    queryKey: [...LISTS, 'containing', gtin],
    queryFn: () => listsContaining(gtin!),
    enabled: !!gtin,
  });
}

export function useShoppingLists() {
  return useQuery({
    queryKey: [...LISTS, 'all'],
    queryFn: async () => {
      await ensureDefaultList();
      return getLists();
    },
  });
}

export function useListItems(listId: string | null | undefined) {
  return useQuery({
    queryKey: [...LISTS, 'items', listId],
    queryFn: () => getItems(listId!),
    enabled: !!listId,
  });
}

/** A mutation that refreshes every pantry/list query when it settles. */
function useAction<A extends unknown[]>(fn: (...a: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: A) => fn(...args),
    onSettled: () =>
      Promise.all([qc.invalidateQueries({queryKey: PANTRY}), qc.invalidateQueries({queryKey: LISTS})]),
  });
}

/** Actions from the Product Insights decision bar. */
export function usePantryActions() {

  const decide = useAction(async (record: ProductRecord, status: ApprovalStatus) => {
    await saveProduct(record);
    await setDecision(record.gtin!, status);
  });
  const confirm = useAction((gtin: string, status: ApprovalStatus) => setDecision(gtin, status));
  const undecide = useAction((gtin: string) => clearDecision(gtin));
  const remove = useAction((gtin: string) => removeProduct(gtin));
  const addToList = useAction(async (record: ProductRecord, listId?: string) => {
    await saveProduct(record);
    const id = listId ?? (await ensureDefaultList());
    await addItem(id, {gtin: record.gtin, label: [record.brand, record.name].filter(Boolean).join(' ')});
  });
  /** Refresh a saved product's data from a new scan (may set "recheck needed"). */
  const refresh = useAction((record: ProductRecord) => saveProduct(record));

  return {decide, confirm, undecide, remove, addToList, refresh};
}

/** Actions on the Shopping List screen. */
export function useListActions() {

  return {
    create: useAction((name: string) => createList(name)),
    rename: useAction((id: string, name: string) => renameList(id, name)),
    remove: useAction((id: string) => deleteList(id)),
    addFreeText: useAction((listId: string, label: string) => addItem(listId, {label})),
    addProduct: useAction((listId: string, gtin: string, label: string) => addItem(listId, {gtin, label})),
    check: useAction((itemId: string, checked: boolean) => setChecked(itemId, checked)),
    quantity: useAction((itemId: string, qty: number) => setQuantity(itemId, qty)),
    removeItem: useAction((itemId: string) => removeItem(itemId)),
    finish: useAction((listId: string, mode: 'remove' | 'reset') => finishTrip(listId, mode)),
  };
}

export type CategoryFilter = ProductCategory | 'all';
