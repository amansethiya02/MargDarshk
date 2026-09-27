import { LRUCacheEntry, LRUNodeState } from '../types';

export class LRUCacheSimulator {
  capacity: number;
  cacheMap: Map<string, LRUCacheEntry>;
  accessOrder: string[]; // Front = most recently used, Back = least recently used
  hitCount: number = 0;
  missCount: number = 0;

  constructor(capacity: number = 4) {
    this.capacity = capacity;
    this.cacheMap = new Map();
    this.accessOrder = [];
  }

  get(key: string): LRUCacheEntry | null {
    if (!this.cacheMap.has(key)) {
      this.missCount++;
      return null;
    }

    this.hitCount++;
    const entry = this.cacheMap.get(key)!;
    entry.hits++;
    entry.lastAccessed = Date.now();

    // Move to front of access order
    this.accessOrder = [key, ...this.accessOrder.filter(k => k !== key)];
    return entry;
  }

  put(key: string, entryData: Omit<LRUCacheEntry, 'hits' | 'lastAccessed'>): { evictedKey: string | null } {
    let evictedKey: string | null = null;

    if (this.cacheMap.has(key)) {
      const existing = this.cacheMap.get(key)!;
      existing.path = entryData.path;
      existing.distance = entryData.distance;
      existing.timeMin = entryData.timeMin;
      existing.hits++;
      existing.lastAccessed = Date.now();
      this.accessOrder = [key, ...this.accessOrder.filter(k => k !== key)];
      return { evictedKey: null };
    }

    if (this.cacheMap.size >= this.capacity) {
      evictedKey = this.accessOrder.pop() || null;
      if (evictedKey) {
        this.cacheMap.delete(evictedKey);
      }
    }

    const newEntry: LRUCacheEntry = {
      ...entryData,
      hits: 1,
      lastAccessed: Date.now()
    };

    this.cacheMap.set(key, newEntry);
    this.accessOrder = [key, ...this.accessOrder];

    return { evictedKey };
  }

  getNodeStates(): LRUNodeState[] {
    const list: LRUNodeState[] = [];
    for (let i = 0; i < this.accessOrder.length; i++) {
      const key = this.accessOrder[i];
      const entry = this.cacheMap.get(key);
      const valStr = entry ? `${entry.distance}km / ${entry.timeMin}m` : '';
      list.push({
        key,
        val: valStr,
        prev: i > 0 ? this.accessOrder[i - 1] : 'HEAD',
        next: i < this.accessOrder.length - 1 ? this.accessOrder[i + 1] : 'TAIL'
      });
    }
    return list;
  }

  getHitRatio(): number {
    const total = this.hitCount + this.missCount;
    return total === 0 ? 0 : Math.round((this.hitCount / total) * 100);
  }

  clear() {
    this.cacheMap.clear();
    this.accessOrder = [];
    this.hitCount = 0;
    this.missCount = 0;
  }
}
