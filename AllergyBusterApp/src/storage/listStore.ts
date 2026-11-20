import {ProductCategory} from '../types/product';
import {ApprovalStatus, ShoppingList, ShoppingListItem} from '../types/pantry';
import {getDb} from './db';
import {newId, nowIso} from './ids';
import {SqlRow} from './sqlTypes';

export const DEFAULT_LIST_NAME = 'My Shopping List';

/** Returns the first list, creating "My Shopping List" if there are none. */
export async function ensureDefaultList(): Promise<string> {
  const db = await getDb();
  const {rows} = await db.execute('SELECT id FROM shopping_list ORDER BY sort_order, created_at LIMIT 1');
  if (rows[0]) {
    return String(rows[0].id);
  }
  return createList(DEFAULT_LIST_NAME);
}

export async function createList(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('List name is required');
  }
  const db = await getDb();
  const id = newId('list');
  const now = nowIso();
  const {rows} = await db.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM shopping_list');
  await db.execute(
    'INSERT INTO shopping_list (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, trimmed, Number(rows[0]?.next ?? 0), now, now],
  );
  return id;
}

export async function renameList(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('List name is required');
  }
  const db = await getDb();
  await db.execute('UPDATE shopping_list SET name = ?, updated_at = ? WHERE id = ?', [trimmed, nowIso(), id]);
}

export async function deleteList(id: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM shopping_list WHERE id = ?', [id]);
}

export async function getLists(): Promise<ShoppingList[]> {
  const db = await getDb();
  const {rows} = await db.execute(
    `SELECT l.id, l.name,
            COUNT(i.id) AS item_count,
            COALESCE(SUM(CASE WHEN i.checked = 0 THEN 1 ELSE 0 END), 0) AS unchecked_count
     FROM shopping_list l
     LEFT JOIN shopping_list_item i ON i.list_id = l.id
     GROUP BY l.id
     ORDER BY l.sort_order, l.created_at`,
  );
  return rows.map(r => ({
    id: String(r.id),
    name: String(r.name),
    itemCount: Number(r.item_count),
    uncheckedCount: Number(r.unchecked_count),
  }));
}

function toItem(r: SqlRow): ShoppingListItem {
  return {
    id: String(r.id),
    listId: String(r.list_id),
    gtin: r.gtin ? String(r.gtin) : null,
    label: String(r.label),
    quantity: Number(r.quantity),
    checked: Number(r.checked) === 1,
    approvalStatus: r.status ? (String(r.status) as ApprovalStatus) : null,
    recheckNeeded: r.status != null && r.approved_hash !== r.latest_hash,
    category: r.category ? (String(r.category) as ProductCategory) : null,
  };
}

/** Unchecked items first (in the order added), then checked items. */
export async function getItems(listId: string): Promise<ShoppingListItem[]> {
  const db = await getDb();
  const {rows} = await db.execute(
    `SELECT i.id, i.list_id, i.gtin, i.label, i.quantity, i.checked,
            p.category, a.status,
            sa.content_hash AS approved_hash,
            (SELECT content_hash FROM product_snapshot WHERE gtin = i.gtin ORDER BY id DESC LIMIT 1) AS latest_hash
     FROM shopping_list_item i
     LEFT JOIN product p ON p.gtin = i.gtin
     LEFT JOIN product_approval a ON a.gtin = i.gtin
     LEFT JOIN product_snapshot sa ON sa.id = a.snapshot_id
     WHERE i.list_id = ?
     ORDER BY i.checked, i.sort_order, i.added_at`,
    [listId],
  );
  return rows.map(toItem);
}

/**
 * Adds a saved product (by gtin) or a free-text item. Adding a product that
 * is already on the list unchecked increases its quantity instead.
 */
export async function addItem(
  listId: string,
  item: {gtin?: string | null; label: string; quantity?: number},
): Promise<string> {
  const label = item.label.trim();
  if (!label) {
    throw new Error('Item name is required');
  }
  const qty = Math.max(1, Math.floor(item.quantity ?? 1));
  const db = await getDb();
  let id = '';
  await db.transaction(async tx => {
    if (item.gtin) {
      const {rows} = await tx.execute(
        'SELECT id FROM shopping_list_item WHERE list_id = ? AND gtin = ? AND checked = 0 LIMIT 1',
        [listId, item.gtin],
      );
      if (rows[0]) {
        id = String(rows[0].id);
        await tx.execute('UPDATE shopping_list_item SET quantity = quantity + ? WHERE id = ?', [qty, id]);
        return;
      }
    }
    id = newId('item');
    const {rows: order} = await tx.execute(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM shopping_list_item WHERE list_id = ?',
      [listId],
    );
    await tx.execute(
      `INSERT INTO shopping_list_item (id, list_id, gtin, label, quantity, checked, sort_order, added_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, listId, item.gtin ?? null, label, qty, Number(order[0]?.next ?? 0), nowIso()],
    );
    await tx.execute('UPDATE shopping_list SET updated_at = ? WHERE id = ?', [nowIso(), listId]);
  });
  return id;
}

export async function setChecked(itemId: string, checked: boolean): Promise<void> {
  const db = await getDb();
  await db.execute('UPDATE shopping_list_item SET checked = ? WHERE id = ?', [checked ? 1 : 0, itemId]);
}

export async function setQuantity(itemId: string, quantity: number): Promise<void> {
  const db = await getDb();
  if (quantity < 1) {
    await db.execute('DELETE FROM shopping_list_item WHERE id = ?', [itemId]);
    return;
  }
  await db.execute('UPDATE shopping_list_item SET quantity = ? WHERE id = ?', [Math.floor(quantity), itemId]);
}

export async function removeItem(itemId: string): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM shopping_list_item WHERE id = ?', [itemId]);
}

/** After a shopping trip: remove ticked items, or untick them for reuse. */
export async function finishTrip(listId: string, mode: 'remove' | 'reset'): Promise<void> {
  const db = await getDb();
  if (mode === 'remove') {
    await db.execute('DELETE FROM shopping_list_item WHERE list_id = ? AND checked = 1', [listId]);
  } else {
    await db.execute('UPDATE shopping_list_item SET checked = 0 WHERE list_id = ?', [listId]);
  }
}

/** Lists that contain a product (to show "On your list" on the product screen). */
export async function listsContaining(gtin: string): Promise<string[]> {
  const db = await getDb();
  const {rows} = await db.execute(
    'SELECT DISTINCT list_id FROM shopping_list_item WHERE gtin = ? AND checked = 0',
    [gtin],
  );
  return rows.map(r => String(r.list_id));
}
