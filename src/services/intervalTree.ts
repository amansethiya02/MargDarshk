import { DockInterval } from '../types';

export class IntervalTreeNode {
  interval: DockInterval;
  maxHigh: number;
  left: IntervalTreeNode | null = null;
  right: IntervalTreeNode | null = null;

  constructor(interval: DockInterval) {
    this.interval = interval;
    this.maxHigh = interval.endMinutes;
  }
}

export class IntervalTreeSimulator {
  root: IntervalTreeNode | null = null;

  insert(interval: DockInterval) {
    this.root = this.insertRec(this.root, interval);
  }

  private insertRec(node: IntervalTreeNode | null, interval: DockInterval): IntervalTreeNode {
    if (!node) return new IntervalTreeNode(interval);

    if (interval.startMinutes < node.interval.startMinutes) {
      node.left = this.insertRec(node.left, interval);
    } else {
      node.right = this.insertRec(node.right, interval);
    }

    const leftMax = node.left ? node.left.maxHigh : 0;
    const rightMax = node.right ? node.right.maxHigh : 0;
    node.maxHigh = Math.max(node.interval.endMinutes, leftMax, rightMax);

    return node;
  }

  // Check if [start, end] overlaps with any existing interval
  // Condition: start < other.end && other.start < end
  findCollision(startMinutes: number, endMinutes: number): DockInterval | null {
    return this.queryOverlap(this.root, startMinutes, endMinutes);
  }

  private queryOverlap(node: IntervalTreeNode | null, start: number, end: number): DockInterval | null {
    if (!node) return null;

    if (start < node.interval.endMinutes && node.interval.startMinutes < end) {
      return node.interval;
    }

    if (node.left && node.left.maxHigh > start) {
      return this.queryOverlap(node.left, start, end);
    }

    return this.queryOverlap(node.right, start, end);
  }

  getAllIntervals(): DockInterval[] {
    const res: DockInterval[] = [];
    const traverse = (node: IntervalTreeNode | null) => {
      if (!node) return;
      traverse(node.left);
      res.push(node.interval);
      traverse(node.right);
    };
    traverse(this.root);
    return res;
  }
}
