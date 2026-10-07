// Workspace snapshots and mutations are scoped to the authenticated account.
export interface PendingMutation {
  id: string; userId: string; path: string; method: string; data?: unknown; version?: string; timestamp: string; error?: string;
}
const key = (kind: string, userId: string) => `han_v2_${kind}_${userId}`;
export function retireLegacyStorage() {
  localStorage.removeItem('han_cached_state_v1');
  const legacy = localStorage.getItem('han_pending_mutations_v1');
  if (legacy) localStorage.setItem('han_legacy_queue_recovery', legacy);
  localStorage.removeItem('han_pending_mutations_v1');
}
export function saveCachedState(userId: string, state: unknown) {
  try { localStorage.setItem(key('cache', userId), JSON.stringify({ state, timestamp: new Date().toISOString() })); } catch { /* Optional cache. */ }
}
export function getCachedState(userId: string): { state: unknown; timestamp: string } | null {
  try { return JSON.parse(localStorage.getItem(key('cache', userId)) || 'null'); } catch { return null; }
}
export function clearAccountCache(userId: string) { localStorage.removeItem(key('cache', userId)); }
export function getPendingMutations(userId: string): PendingMutation[] {
  try { const value = JSON.parse(localStorage.getItem(key('queue', userId)) || '[]'); return Array.isArray(value) ? value.filter(item => item.userId === userId) : []; } catch { return []; }
}
export function enqueueMutation(userId: string, path: string, method: string, data?: unknown, version?: string, id = crypto.randomUUID()): PendingMutation {
  const queue = getPendingMutations(userId);
  if (queue.length >= 100) throw new Error('Offline queue is full. Reconnect and sync before adding more changes.');
  const mutation = { id, userId, path, method, data, version, timestamp: new Date().toISOString() };
  if (!queue.some(item => item.id === id)) queue.push(mutation);
  localStorage.setItem(key('queue', userId), JSON.stringify(queue));
  return mutation;
}
export function removePendingMutation(userId: string, id: string) { localStorage.setItem(key('queue', userId), JSON.stringify(getPendingMutations(userId).filter(item => item.id !== id))); }
export function markMutationFailed(userId: string, id: string, error: string) { localStorage.setItem(key('queue', userId), JSON.stringify(getPendingMutations(userId).map(item => item.id === id ? { ...item, error } : item))); }
