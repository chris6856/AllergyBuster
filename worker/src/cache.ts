/**
 * KV helpers that never fail the request. A cache is an optimisation: if a
 * read or write fails (e.g. a plan's daily write limit is reached), log it
 * and carry on as a cache miss instead of returning an error.
 */
export async function kvGet(kv: KVNamespace, key: string): Promise<string | null> {
  try {
    return await kv.get(key);
  } catch (err) {
    console.error('KV get failed', key, err);
    return null;
  }
}

export async function kvGetJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  try {
    return (await kv.get(key, 'json')) as T | null;
  } catch (err) {
    console.error('KV get failed', key, err);
    return null;
  }
}

export async function kvPut(kv: KVNamespace, key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    await kv.put(key, value, {expirationTtl: Math.max(60, ttlSeconds)});
  } catch (err) {
    console.error('KV put failed', key, err);
  }
}

export async function kvDelete(kv: KVNamespace, key: string): Promise<void> {
  try {
    await kv.delete(key);
  } catch (err) {
    console.error('KV delete failed', key, err);
  }
}
