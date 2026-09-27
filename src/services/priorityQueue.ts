import { DeliveryOrder } from '../types';

export class MinHeapSimulator {
  heap: DeliveryOrder[] = [];

  constructor(initialOrders: DeliveryOrder[] = []) {
    this.heap = [...initialOrders];
    this.heapify();
  }

  // O(N) Bottom-up heapify
  heapify() {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.siftDown(i);
    }
  }

  push(order: DeliveryOrder) {
    this.heap.push(order);
    this.siftUp(this.heap.length - 1);
  }

  pop(): DeliveryOrder | null {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return min;
  }

  peek(): DeliveryOrder | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  private siftUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[index].priorityScore < this.heap[parent].priorityScore) {
        [this.heap[index], this.heap[parent]] = [this.heap[parent], this.heap[index]];
        index = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number) {
    const n = this.heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < n && this.heap[left].priorityScore < this.heap[smallest].priorityScore) {
        smallest = left;
      }
      if (right < n && this.heap[right].priorityScore < this.heap[smallest].priorityScore) {
        smallest = right;
      }

      if (smallest !== index) {
        [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
        index = smallest;
      } else {
        break;
      }
    }
  }

  getTreeNodes(): { order: DeliveryOrder; index: number; parentIndex: number | null; level: number }[] {
    return this.heap.map((order, idx) => ({
      order,
      index: idx,
      parentIndex: idx === 0 ? null : Math.floor((idx - 1) / 2),
      level: Math.floor(Math.log2(idx + 1))
    }));
  }
}
