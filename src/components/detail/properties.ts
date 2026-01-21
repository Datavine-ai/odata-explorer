import type { ODataProperty } from '../../types';

/**
 * Format OData type for display (removes Edm. prefix)
 */
export function formatType(type: string): string {
  return type.replace(/^Edm\./, '');
}

/**
 * Get appropriate badge class for property type
 */
export function getTypeBadgeClass(type: string): string {
  const cleanType = type.replace(/^Edm\./, '').toLowerCase();
  if (['int16', 'int32', 'int64', 'decimal', 'single', 'double', 'byte', 'sbyte'].includes(cleanType)) {
    return 'badge-info';
  }
  if (['string', 'guid'].includes(cleanType)) {
    return 'badge-success';
  }
  if (['boolean'].includes(cleanType)) {
    return 'badge-warning';
  }
  if (['datetimeoffset', 'date', 'timeofday', 'duration'].includes(cleanType)) {
    return 'badge-secondary';
  }
  if (['binary', 'stream'].includes(cleanType)) {
    return 'badge-neutral';
  }
  return 'badge-ghost';
}

/**
 * Render a single property row
 */
export function renderPropertyRow(prop: ODataProperty): string {
  return `
    <tr class="hover">
      <td class="font-medium">
        ${prop.isKey ? '<span class="text-primary mr-1">🔑</span>' : ''}
        ${prop.name}
      </td>
      <td>
        <span class="badge badge-xs ${getTypeBadgeClass(prop.type)}">${formatType(prop.type)}</span>
      </td>
      <td>
        ${prop.nullable 
          ? '<span class="text-base-content/40">-</span>' 
          : '<span class="badge badge-xs badge-warning">Required</span>'}
      </td>
    </tr>
  `;
}
