import {ProductCategory, ProductRecord} from './product';

export type ApprovalStatus = 'approved' | 'needs_review' | 'avoid';

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  approved: 'Approved',
  needs_review: 'Needs review',
  avoid: 'Avoid',
};

export type SnapshotOrigin = 'lookup' | 'photo';

/** A product the user has saved, with its latest data and their decision. */
export interface SavedProduct {
  gtin: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  category: ProductCategory;
  /** Most recent data we have for the product. */
  latest: ProductRecord;
  latestSnapshotId: number;
  /** User's decision, or null if saved without one. */
  approval: {status: ApprovalStatus; note: string; decidedAt: string} | null;
  /**
   * True when the product's ingredients/allergens changed since the user
   * decided. The decision is kept but should be re-confirmed.
   */
  recheckNeeded: boolean;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  itemCount: number;
  uncheckedCount: number;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  gtin: string | null;
  label: string;
  quantity: number;
  checked: boolean;
  /** Joined from the saved product, when the item is one. */
  approvalStatus: ApprovalStatus | null;
  recheckNeeded: boolean;
  category: ProductCategory | null;
}
