import type { ODataNavigationProperty } from '../types';

/**
 * Get unique target entities from navigation properties
 */
export function getUniqueTargetEntities(
  navProps: ODataNavigationProperty[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const nav of navProps) {
    if (!seen.has(nav.targetEntity)) {
      seen.add(nav.targetEntity);
      result.push(nav.targetEntity);
    }
  }
  
  return result.sort();
}
