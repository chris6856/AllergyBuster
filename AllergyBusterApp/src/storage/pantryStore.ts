import {ProductCategory, ProductRecord} from '../types/product';
import {ApprovalStatus, SavedProduct, SnapshotOrigin} from '../types/pantry';
import {productContentHash} from '../utils/contentHash';
import {getDb} from './db';
import {nowIso} from './ids';
import {SqlExecutor, SqlRow} from './sqlTypes';

/**
 * "My Products": products the user saved, their ingredient snapshots and
 * the user's decision. Three separate things (plan §1.5):
 *   - the user's approval decision      → product_approval
 *   - the analysed data at that time    → product_snapshot (approval.snapshot_id)
 *   - the latest data we have           → newest product_snapshot
 */

export interface SaveResult {
  gtin: string;
  snapshotId: number;
  /** True if this data differs from the previous snapshot (formula changed). */
  changed: boolean;
  isNew: boolean;
}

async function latestSnapshot(tx: SqlExecutor, gtin: string): Promise<{id: number; hash: string} | null> {
  const {rows} = await tx.execute(
    'SELECT id, content_hash FROM product_snapshot WHERE gtin = ? ORDER BY id DESC LIMIT 1',
    [gtin],
  );
  return rows[0] ? {id: Number(rows[0].id), hash: String(rows[0].content_hash)} : null;
}

/**
 * Saves (or refreshes) a product. A new snapshot is stored only when the
 * content hash differs from the latest one, so re-scanning an unchanged
 * product doesn't grow the table.
 */
export async function saveProduct(record: ProductRecord, origin: SnapshotOrigin = 'lookup'): Promise<SaveResult> {
  if (!record.gtin) {
    throw new Error('Only products with a barcode can be saved');
  }
  const gtin = record.gtin;
  const db = await getDb();
  const now = nowIso();
  const hash = productContentHash(record);
  let result: SaveResult = {gtin, snapshotId: 0, changed: false, isNew: false};

  await db.transaction(async tx => {
    const {rows: existing} = await tx.execute('SELECT gtin FROM product WHERE gtin = ?', [gtin]);
    const isNew = existing.length === 0;
    if (isNew) {
      await tx.execute(
        `INSERT INTO product (gtin, name, brand, image_url, category, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [gtin, record.name, record.brand, record.imageUrl ?? null, record.category, record.source, now, now],
      );
    } else {
      await tx.execute(
        `UPDATE product SET name = ?, brand = ?, image_url = COALESCE(?, image_url),
           category = ?, source = ?, updated_at = ? WHERE gtin = ?`,
        [record.name, record.brand, record.imageUrl ?? null, record.category, record.source, now, gtin],
      );
    }

    const prev = await latestSnapshot(tx, gtin);
    if (prev && prev.hash === hash) {
      result = {gtin, snapshotId: prev.id, changed: false, isNew};
      return;
    }
    await tx.execute(
      `INSERT INTO product_snapshot (gtin, content_hash, record_json, origin, captured_at)
       VALUES (?, ?, ?, ?, ?)`,
      [gtin, hash, JSON.stringify(record), origin, now],
    );
    const inserted = await latestSnapshot(tx, gtin);
    result = {gtin, snapshotId: inserted!.id, changed: prev !== null, isNew};
  });
  return result;
}

/** Records the user's decision against the product's latest snapshot. */
export async function setDecision(gtin: string, status: ApprovalStatus, note = ''): Promise<void> {
  const db = await getDb();
  await db.transaction(async tx => {
    const snap = await latestSnapshot(tx, gtin);
    if (!snap) {
      throw new Error('Save the product before deciding on it');
    }
    await tx.execute(
      `INSERT INTO product_approval (gtin, status, snapshot_id, note, decided_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(gtin) DO UPDATE SET status = excluded.status, snapshot_id = excluded.snapshot_id,
         note = excluded.note, decided_at = excluded.decided_at`,
      [gtin, status, snap.id, note, nowIso()],
    );
  });
}

export async function clearDecision(gtin: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM product_approval WHERE gtin = ?', [gtin]);
}

/** Removes the product, its snapshots and decision. List items keep their label. */
export async function removeProduct(gtin: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM product WHERE gtin = ?', [gtin]);
}

const SAVED_SELECT = `
  SELECT p.gtin, p.name, p.brand, p.image_url, p.category, p.updated_at,
         s.id AS snap_id, s.record_json, s.content_hash AS latest_hash,
         a.status, a.note, a.decided_at, sa.content_hash AS approved_hash
  FROM product p
  JOIN product_snapshot s ON s.id = (SELECT MAX(id) FROM product_snapshot WHERE gtin = p.gtin)
  LEFT JOIN product_approval a ON a.gtin = p.gtin
  LEFT JOIN product_snapshot sa ON sa.id = a.snapshot_id`;

function toSaved(r: SqlRow): SavedProduct {
  const status = r.status ? (String(r.status) as ApprovalStatus) : null;
  return {
    gtin: String(r.gtin),
    name: String(r.name),
    brand: String(r.brand ?? ''),
    imageUrl: r.image_url ? String(r.image_url) : null,
    category: String(r.category) as ProductCategory,
    latest: JSON.parse(String(r.record_json)) as ProductRecord,
    latestSnapshotId: Number(r.snap_id),
    approval: status
      ? {status, note: String(r.note ?? ''), decidedAt: String(r.decided_at)}
      : null,
    recheckNeeded: status !== null && r.approved_hash !== r.latest_hash,
    updatedAt: String(r.updated_at),
  };
}

export async function getSavedProduct(gtin: string): Promise<SavedProduct | null> {
  const db = await getDb();
  const {rows} = await db.execute(`${SAVED_SELECT} WHERE p.gtin = ?`, [gtin]);
  return rows[0] ? toSaved(rows[0]) : null;
}

export interface SavedProductFilter {
  category?: ProductCategory;
  /** 'none' = saved without a decision. */
  status?: ApprovalStatus | 'none';
  recheckOnly?: boolean;
}

export async function listSavedProducts(filter: SavedProductFilter = {}): Promise<SavedProduct[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.category) {
    where.push('p.category = ?');
    params.push(filter.category);
  }
  if (filter.status === 'none') {
    where.push('a.status IS NULL');
  } else if (filter.status) {
    where.push('a.status = ?');
    params.push(filter.status);
  }
  const sql = `${SAVED_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY p.name COLLATE NOCASE`;
  const {rows} = await db.execute(sql, params);
  const all = rows.map(toSaved);
  return filter.recheckOnly ? all.filter(p => p.recheckNeeded) : all;
}

export async function countSavedProducts(): Promise<number> {
  const db = await getDb();
  const {rows} = await db.execute('SELECT COUNT(*) AS n FROM product');
  return Number(rows[0]?.n ?? 0);
}
