import { HubNode, RouteEdge, AlgorithmStep, ShortestPathResult, RoutingGoal } from '../types';

export function runDijkstraSimulation(
  nodes: HubNode[],
  edges: RouteEdge[],
  startId: string,
  endId: string,
  mode: 'dijkstra' | 'astar' = 'dijkstra',
  goal: RoutingGoal = 'fastest'
): ShortestPathResult {
  const startTime = performance.now();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const targetNode = nodeMap.get(endId);
  const startNode = nodeMap.get(startId);

  if (!startNode || !targetNode) {
    return {
      path: [],
      totalDistanceKm: 0,
      totalTimeMin: 0,
      totalToll: 0,
      totalFuelLiters: 0,
      exploredCount: 0,
      steps: [],
      executionTimeUs: 0,
      routingGoal: goal
    };
  }

  // Build Adjacency List
  const adj = new Map<string, { to: string; distance: number; time: number; toll: number; edgeId: string; factor: number; blocked: boolean }[]>();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    adj.get(e.from)?.push({
      to: e.to,
      distance: e.distanceKm,
      time: e.baseTimeMin,
      toll: e.tollCostINR,
      edgeId: e.id,
      factor: e.trafficMultiplier,
      blocked: e.isBlocked
    });
    adj.get(e.to)?.push({
      to: e.from,
      distance: e.distanceKm,
      time: e.baseTimeMin,
      toll: e.tollCostINR,
      edgeId: e.id,
      factor: e.trafficMultiplier,
      blocked: e.isBlocked
    });
  });

  const distances: Record<string, number> = {};
  const heuristics: Record<string, number> = {};
  const fScores: Record<string, number> = {};
  const parent: Record<string, string | null> = {};
  const visitedSet = new Set<string>();

  // Heuristic function for A* (Euclidean distance on 2D canvas coordinates)
  const calcHeuristic = (uId: string) => {
    if (mode === 'dijkstra') return 0;
    const u = nodeMap.get(uId);
    if (!u) return 0;
    const dx = u.x - targetNode.x;
    const dy = u.y - targetNode.y;
    // Scale canvas distance to rough km
    return Math.sqrt(dx * dx + dy * dy) * 1.8;
  };

  nodes.forEach(n => {
    distances[n.id] = Infinity;
    heuristics[n.id] = calcHeuristic(n.id);
    fScores[n.id] = Infinity;
    parent[n.id] = null;
  });

  distances[startId] = 0;
  fScores[startId] = heuristics[startId];

  // Min-Priority Queue
  const pq: { id: string; priority: number }[] = [];
  pq.push({ id: startId, priority: fScores[startId] });

  const steps: AlgorithmStep[] = [];

  steps.push({
    currentHubId: startId,
    visited: [],
    distances: { ...distances },
    heuristics: { ...heuristics },
    fScores: { ...fScores },
    parent: { ...parent },
    queueState: [...pq],
    description: `Initialized search at ${startNode.name} (${startId}). Base distance = 0 km.`,
    updatedEdges: []
  });

  while (pq.length > 0) {
    // Sort priority queue (Min-Heap simulation)
    pq.sort((a, b) => a.priority - b.priority);
    const top = pq.shift()!;
    const u = top.id;

    if (visitedSet.has(u)) continue;
    visitedSet.add(u);

    if (u === endId) {
      steps.push({
        currentHubId: u,
        visited: Array.from(visitedSet),
        distances: { ...distances },
        heuristics: { ...heuristics },
        fScores: { ...fScores },
        parent: { ...parent },
        queueState: [...pq],
        description: `Reached target destination ${targetNode.name} (${endId})! Path reconstruction initiated.`,
        updatedEdges: []
      });
      break;
    }

    const neighbors = adj.get(u) || [];
    const updatedEdgeList: string[] = [];

    for (const edge of neighbors) {
      if (edge.blocked) continue;
      const v = edge.to;
      if (visitedSet.has(v)) continue;

      let effectiveCost = edge.distance;
      if (goal === 'fastest') {
        effectiveCost = edge.time * edge.factor;
      } else if (goal === 'shortest') {
        effectiveCost = edge.distance;
      } else if (goal === 'economic') {
        effectiveCost = edge.distance + (edge.toll > 0 ? 15 : 0);
      } else if (goal === 'eco_green') {
        effectiveCost = edge.distance * (edge.factor > 1.08 ? 1.45 : 1.0);
      }

      if (distances[u] + effectiveCost < distances[v]) {
        distances[v] = distances[u] + effectiveCost;
        parent[v] = u;
        fScores[v] = distances[v] + heuristics[v];
        pq.push({ id: v, priority: fScores[v] });
        updatedEdgeList.push(edge.edgeId);
      }
    }

    steps.push({
      currentHubId: u,
      visited: Array.from(visitedSet),
      distances: { ...distances },
      heuristics: { ...heuristics },
      fScores: { ...fScores },
      parent: { ...parent },
      queueState: [...pq],
      description: `Explored hub ${nodeMap.get(u)?.name ?? u}. Relaxed ${updatedEdgeList.length} outgoing edges.`,
      updatedEdges: updatedEdgeList
    });
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = endId;
  if (distances[endId] !== Infinity) {
    while (curr) {
      path.push(curr);
      curr = parent[curr];
    }
    path.reverse();
  }

  let totalDistanceKm = 0;
  let totalTimeMin = 0;
  let totalToll = 0;
  let totalFuelLiters = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const matchEdge = edges.find(e => (e.from === from && e.to === to) || (e.from === to && e.to === from));
    if (matchEdge) {
      totalDistanceKm += matchEdge.distanceKm;
      totalTimeMin += Math.round(matchEdge.baseTimeMin * matchEdge.trafficMultiplier);
      totalToll += matchEdge.tollCostINR;
      totalFuelLiters += matchEdge.fuelLitersEst;
    }
  }

  const executionTimeUs = Math.round((performance.now() - startTime) * 1000);

  return {
    path,
    totalDistanceKm: Math.round(totalDistanceKm),
    totalTimeMin: Math.round(totalTimeMin),
    totalToll,
    totalFuelLiters,
    exploredCount: visitedSet.size,
    steps,
    executionTimeUs: Math.max(12, executionTimeUs),
    routingGoal: goal
  };
}
