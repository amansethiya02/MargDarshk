import { HubNode, RouteEdge } from '../types';
import { runDijkstraSimulation } from './dijkstra';

export interface TspResult {
  orderedHubs: HubNode[];
  fullPathIds: string[];
  totalDistanceKm: number;
  totalTimeMin: number;
  naiveDistanceKm: number;
  distanceSavedKm: number;
  percentSaved: number;
  legs: {
    from: HubNode;
    to: HubNode;
    distanceKm: number;
    timeMin: number;
  }[];
}

/**
 * Solves the Traveling Salesperson Delivery Loop Problem (TSP) for up to 6 stops
 * Evaluates permutations or Nearest Neighbor + 2-Opt to find the optimal delivery tour.
 */
export function solveDeliveryTsp(
  startHub: HubNode,
  deliveryStops: HubNode[],
  allHubs: HubNode[],
  edges: RouteEdge[],
  returnToStart: boolean = false
): TspResult {
  if (deliveryStops.length === 0) {
    return {
      orderedHubs: [startHub],
      fullPathIds: [startHub.id],
      totalDistanceKm: 0,
      totalTimeMin: 0,
      naiveDistanceKm: 0,
      distanceSavedKm: 0,
      percentSaved: 0,
      legs: []
    };
  }

  // Pre-calculate shortest path distance and path between all involved nodes using Dijkstra
  const involvedNodes = [startHub, ...deliveryStops];
  const pairCache = new Map<string, { dist: number; time: number; path: string[] }>();

  const getPair = (fromId: string, toId: string) => {
    const key = `${fromId}->${toId}`;
    if (pairCache.has(key)) return pairCache.get(key)!;
    const res = runDijkstraSimulation(allHubs, edges, fromId, toId, 'dijkstra', 'shortest');
    const data = { dist: res.totalDistanceKm, time: res.totalTimeMin, path: res.path };
    pairCache.set(key, data);
    return data;
  };

  // Naive distance (in original order without TSP optimization)
  let naiveDistance = 0;
  let currNaive = startHub.id;
  for (const stop of deliveryStops) {
    naiveDistance += getPair(currNaive, stop.id).dist;
    currNaive = stop.id;
  }
  if (returnToStart) {
    naiveDistance += getPair(currNaive, startHub.id).dist;
  }

  // Generate all permutations of deliveryStops (N <= 6, at most 720 permutations)
  const permute = (arr: HubNode[]): HubNode[][] => {
    if (arr.length <= 1) return [arr];
    const result: HubNode[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const remainingPermuted = permute(remaining);
      for (const p of remainingPermuted) {
        result.push([current, ...p]);
      }
    }
    return result;
  };

  const allPermutations = permute(deliveryStops);

  let bestPermutation: HubNode[] = deliveryStops;
  let bestDistance = Infinity;

  for (const perm of allPermutations) {
    let currentDist = 0;
    let prevId = startHub.id;

    for (const stop of perm) {
      currentDist += getPair(prevId, stop.id).dist;
      prevId = stop.id;
    }

    if (returnToStart) {
      currentDist += getPair(prevId, startHub.id).dist;
    }

    if (currentDist < bestDistance) {
      bestDistance = currentDist;
      bestPermutation = perm;
    }
  }

  // Construct legs and full composite path
  const orderedHubs = [startHub, ...bestPermutation];
  if (returnToStart) orderedHubs.push(startHub);

  const legs: { from: HubNode; to: HubNode; distanceKm: number; timeMin: number }[] = [];
  const fullPathIds: string[] = [];
  let totalTime = 0;

  for (let i = 0; i < orderedHubs.length - 1; i++) {
    const fromNode = orderedHubs[i];
    const toNode = orderedHubs[i + 1];
    const legData = getPair(fromNode.id, toNode.id);

    legs.push({
      from: fromNode,
      to: toNode,
      distanceKm: legData.dist,
      timeMin: legData.time
    });

    totalTime += legData.time;

    // Concat path without duplicate joints
    if (fullPathIds.length === 0) {
      fullPathIds.push(...legData.path);
    } else {
      fullPathIds.push(...legData.path.slice(1));
    }
  }

  const distanceSaved = Math.max(0, Math.round((naiveDistance - bestDistance) * 10) / 10);
  const percentSaved = naiveDistance > 0 ? Math.round((distanceSaved / naiveDistance) * 100) : 0;

  return {
    orderedHubs,
    fullPathIds,
    totalDistanceKm: Math.round(bestDistance * 10) / 10,
    totalTimeMin: Math.round(totalTime),
    naiveDistanceKm: Math.round(naiveDistance * 10) / 10,
    distanceSavedKm: distanceSaved,
    percentSaved,
    legs
  };
}
