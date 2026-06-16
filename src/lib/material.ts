import type { CommodityGroup } from '../types'

// CarbonBridge — the importer's primary lens: MATERIAL.
// An importer thinks in the materials they actually declare (steel / aluminium /
// cement), so a single global switcher scopes every screen to one material at
// once. 'all' shows the whole book.

export type Material = 'all' | 'steel' | 'aluminium' | 'cement'

export const MATERIALS: { id: Material; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '◈' },
  { id: 'steel', label: 'Steel', icon: '▰' },
  { id: 'aluminium', label: 'Aluminium', icon: '◇' },
  { id: 'cement', label: 'Cement', icon: '▢' },
]

/** Filter any commodity-bearing list (suppliers) by the active material. */
export function byMaterial<T extends { commodity: CommodityGroup }>(
  items: T[],
  material: Material,
): T[] {
  return material === 'all' ? items : items.filter((i) => i.commodity === material)
}

/** Climate TRACE subsector string for a material (Evidence reads raw facilities). */
export const SUBSECTOR_FOR: Record<Exclude<Material, 'all'>, string> = {
  steel: 'iron-and-steel',
  aluminium: 'aluminum',
  cement: 'cement',
}

/** Filter raw Climate TRACE facilities (which carry `subsector`, not `commodity`). */
export function facilitiesByMaterial<T extends { subsector: string }>(
  facilities: T[],
  material: Material,
): T[] {
  if (material === 'all') return facilities
  return facilities.filter((f) => f.subsector === SUBSECTOR_FOR[material])
}
