// ─── useClusters.ts ───────────────────────────────────────────────────────────
// Agrupa features GeoJSON por proximidade geográfica (Union-Find).
// Dois pontos pertencem ao mesmo cluster se a distância entre eles
// for menor que `radiusMeters`.

import { useMemo } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ClusterFeature {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  properties: Record<string, any>;
}

export interface Cluster {
  id: string; // id do primeiro membro (estável)
  members: ClusterFeature[];
  centroid: [number, number]; // [lng, lat] — média das coordenadas
}

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineMeters(
  [lngA, latA]: [number, number],
  [lngB, latB]: [number, number],
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Union-Find ───────────────────────────────────────────────────────────────

function makeUnionFind(n: number) {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: number, b: number) {
    parent[find(a)] = find(b);
  }
  return { find, union };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param features   Array de features GeoJSON do tipo Point
 * @param radiusMeters  Distância máxima para considerar dois pontos no mesmo cluster
 */
export function useClusters(
  features: ClusterFeature[],
  radiusMeters: number,
): Cluster[] {
  return useMemo(() => {
    if (features.length === 0) return [];

    const { find, union } = makeUnionFind(features.length);

    // Une pares dentro do raio
    for (let i = 0; i < features.length; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const dist = haversineMeters(
          features[i].coordinates,
          features[j].coordinates,
        );
        if (dist <= radiusMeters) union(i, j);
      }
    }

    // Agrupa por raiz
    const groups = new Map<number, ClusterFeature[]>();
    for (let i = 0; i < features.length; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(features[i]);
    }

    // Constrói clusters com centróide
    return Array.from(groups.values()).map((members) => {
      const avgLng =
        members.reduce((s, m) => s + m.coordinates[0], 0) / members.length;
      const avgLat =
        members.reduce((s, m) => s + m.coordinates[1], 0) / members.length;
      return {
        id: members[0].id,
        members,
        centroid: [avgLng, avgLat],
      };
    });
  }, [features, radiusMeters]);
}
