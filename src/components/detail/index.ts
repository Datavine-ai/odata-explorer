import { store } from '../../state';
import type { ODataEntity, ODataNavigationProperty, ODataComplexType, ODataProperty } from '../../types';
import { formatNumber } from '../../lib';
import { formatType, renderPropertyRow } from './properties';

export function createDetailView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'bg-base-100 rounded-box shadow-sm h-full overflow-hidden flex flex-col';

  const render = () => {
    const state = store.getState();

    if (!state.metadata) {
      container.innerHTML = renderEmptyState(
        'No metadata loaded',
        'Parse some OData metadata to get started',
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>`
      );
      return;
    }

    if (!state.selectedEntity) {
      container.innerHTML = renderEmptyState(
        'Select an entity',
        'Click an entity from the sidebar to view details',
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>`
      );
      return;
    }

    // Get current view type (entity or complex type from navigation path)
    const currentView = store.getCurrentViewType();
    
    if (!currentView) {
      container.innerHTML = renderEmptyState(
        'Select an entity',
        'Click an entity from the sidebar to view details',
        `<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>`
      );
      return;
    }

    const entityNames = new Set(state.metadata.allEntities.map(e => e.name));

    if (currentView.kind === 'entity') {
      container.innerHTML = renderEntityDetail(currentView.data, entityNames, state.navigationPath.length > 0);
    } else {
      container.innerHTML = renderComplexTypeDetail(currentView.data, entityNames, state.selectedEntity!);
    }
    
    attachEventListeners(container);
  };

  store.subscribe(render);
  render();

  return container;
}

function renderEmptyState(title: string, subtitle: string, icon: string): string {
  return `
    <div class="flex items-center justify-center h-full text-base-content/50">
      <div class="text-center p-8">
        ${icon}
        <p class="text-lg font-medium">${title}</p>
        <p class="text-sm mt-1">${subtitle}</p>
      </div>
    </div>
  `;
}

function renderBreadcrumbs(entity: ODataEntity): string {
  const state = store.getState();
  const path = state.navigationPath;
  
  if (path.length === 0) {
    return ''; // No breadcrumbs needed at root
  }

  return `
    <div class="breadcrumbs text-sm px-4 py-2 bg-base-200/50 border-b border-base-200 flex-shrink-0">
      <ul>
        <li>
          <a class="breadcrumb-link cursor-pointer hover:text-primary" data-index="-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            ${entity.name}
          </a>
        </li>
        ${path.map((step, index) => `
          <li>
            ${index === path.length - 1 
              ? `<span class="font-semibold">${step.displayName}</span>`
              : `<a class="breadcrumb-link cursor-pointer hover:text-primary" data-index="${index}">${step.displayName}</a>`
            }
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderEntityDetail(entity: ODataEntity, entityNames: Set<string>, hasNavPath: boolean): string {
  return `
    ${hasNavPath ? renderBreadcrumbs(entity) : ''}
    <div class="p-4 border-b border-base-200 bg-base-200/30 flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="badge badge-primary badge-sm">Entity</span>
        <h2 class="text-xl font-bold truncate">${entity.name}</h2>
      </div>
      <p class="text-xs text-base-content/60 font-mono truncate">${entity.fullName}</p>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      ${renderKeySection(entity.keyProperties, entity.properties)}
      ${renderNestedCollectionsSection(entity.properties)}
      ${renderPropertiesSection(entity.properties)}
      ${renderRelationshipsSection(entity.navigationProperties, entityNames)}
      ${entity.baseType ? renderBaseType(entity.baseType) : ''}
    </div>
  `;
}

function renderComplexTypeDetail(complexType: ODataComplexType, entityNames: Set<string>, rootEntity: ODataEntity): string {
  const displayName = complexType.name.replace(/^c_/, '');
  
  return `
    ${renderBreadcrumbs(rootEntity)}
    <div class="p-4 border-b border-base-200 bg-accent/10 flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="badge badge-accent badge-sm">ComplexType</span>
        <h2 class="text-xl font-bold truncate">${displayName}</h2>
      </div>
      <p class="text-xs text-base-content/60 font-mono truncate">${complexType.fullName}</p>
      ${complexType.keyProperty ? `<p class="text-xs text-base-content/60 mt-1">Key: ${complexType.keyProperty}</p>` : ''}
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      ${renderKeySection(complexType.keyProperty ? [complexType.keyProperty] : [], complexType.properties)}
      ${renderNestedCollectionsSection(complexType.properties)}
      ${renderPropertiesSection(complexType.properties)}
      ${renderRelationshipsSection(complexType.navigationProperties, entityNames)}
      ${complexType.baseType ? renderBaseType(complexType.baseType) : ''}
    </div>
  `;
}

function renderKeySection(keyProperties: string[], properties: ODataProperty[]): string {
  if (keyProperties.length === 0) return '';

  return `
    <div class="card card-compact bg-base-200/50">
      <div class="card-body">
        <h3 class="card-title text-sm">Primary Key</h3>
        <div class="flex flex-wrap gap-2">
          ${keyProperties.map(key => {
            const prop = properties.find(p => p.name === key);
            return `
              <span class="badge badge-primary gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                ${key}
                ${prop ? `<span class="opacity-70">(${formatType(prop.type)})</span>` : ''}
              </span>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderPropertiesSection(properties: ODataProperty[]): string {
  if (properties.length === 0) return '';

  // Filter out collection properties (they're shown in nested collections section)
  const scalarProperties = properties.filter(p => !p.type.startsWith('Collection('));
  
  if (scalarProperties.length === 0) return '';

  const collapsed = scalarProperties.length > 15;
  const visibleProps = collapsed ? scalarProperties.slice(0, 15) : scalarProperties;

  return `
    <div class="card card-compact bg-base-200/50">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm">Properties (${formatNumber(scalarProperties.length)})</h3>
          ${collapsed ? `
            <button class="btn btn-xs btn-ghost toggle-properties" data-expanded="false">
              Show all
            </button>
          ` : ''}
        </div>
        <div class="overflow-x-auto">
          <table class="table table-xs">
            <thead>
              <tr class="text-xs">
                <th>Name</th>
                <th>Type</th>
                <th>Required</th>
              </tr>
            </thead>
            <tbody id="properties-tbody">
              ${visibleProps.map(prop => renderPropertyRow(prop)).join('')}
            </tbody>
          </table>
          ${collapsed ? `
            <div id="hidden-properties" class="hidden">
              <table class="table table-xs">
                <tbody>
                  ${scalarProperties.slice(15).map(prop => renderPropertyRow(prop)).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderNestedCollectionsSection(properties: ODataProperty[]): string {
  // Find all collection properties that reference ComplexTypes
  const collectionProps = properties.filter(p => {
    const result = store.isComplexTypeCollection(p.type);
    return result.isCollection && result.typeName;
  });

  if (collectionProps.length === 0) return '';

  return `
    <div class="card card-compact bg-warning/10 border border-warning/30">
      <div class="card-body">
        <h3 class="card-title text-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Nested Collections (${collectionProps.length})
        </h3>
        <div class="space-y-1">
          ${collectionProps.map(prop => {
            const result = store.isComplexTypeCollection(prop.type);
            const displayTypeName = result.typeName?.replace(/^c_/, '') || 'Unknown';
            return `
              <div class="flex items-center gap-2 text-sm py-2 px-3 rounded bg-base-100 hover:bg-warning/20 cursor-pointer nested-collection-link transition-colors"
                   data-property="${prop.name}" data-type="${result.typeName}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span class="font-medium flex-1">${prop.name}</span>
                <span class="badge badge-sm badge-warning badge-outline">${displayTypeName}</span>
                <span class="badge badge-xs badge-ghost">Collection</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderRelationshipsSection(
  navProps: ODataNavigationProperty[],
  entityNames: Set<string>
): string {
  if (navProps.length === 0) return '';

  // Sort by target entity name
  const sorted = [...navProps].sort((a, b) => a.targetEntity.localeCompare(b.targetEntity));
  
  const collapsed = sorted.length > 20;
  const visible = collapsed ? sorted.slice(0, 20) : sorted;

  return `
    <div class="card card-compact bg-base-200/50">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <h3 class="card-title text-sm">Relationships (${formatNumber(navProps.length)})</h3>
          ${collapsed ? `
            <button class="btn btn-xs btn-ghost toggle-relationships" data-expanded="false">
              Show all
            </button>
          ` : ''}
        </div>
        <div class="space-y-1" id="relationships-list">
          ${visible.map(nav => renderNavProperty(nav, entityNames)).join('')}
        </div>
        ${collapsed ? `
          <div id="hidden-relationships" class="hidden space-y-1">
            ${sorted.slice(20).map(nav => renderNavProperty(nav, entityNames)).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderNavProperty(nav: ODataNavigationProperty, entityNames: Set<string>): string {
  const exists = entityNames.has(nav.targetEntity);
  return `
    <div class="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-base-200 ${exists ? 'cursor-pointer nav-link' : ''}" 
         ${exists ? `data-target="${nav.targetEntity}"` : ''}>
      <span class="text-primary">→</span>
      <span class="${exists ? 'hover:text-primary' : 'text-base-content/50'} flex-1 truncate">
        ${nav.targetEntity}
      </span>
      <span class="badge badge-xs ${nav.isCollection ? 'badge-secondary' : 'badge-ghost'}">
        ${nav.isCollection ? 'many' : 'one'}
      </span>
    </div>
  `;
}

function renderBaseType(baseType: string): string {
  return `
    <div class="card card-compact bg-base-200/50">
      <div class="card-body">
        <h3 class="card-title text-sm">Inheritance</h3>
        <p class="text-sm">
          Extends: <span class="font-mono text-primary">${baseType}</span>
        </p>
      </div>
    </div>
  `;
}

function attachEventListeners(container: HTMLElement) {
  // Toggle properties
  container.querySelector('.toggle-properties')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    const hiddenProps = container.querySelector('#hidden-properties');
    const expanded = btn.dataset.expanded === 'true';

    if (hiddenProps) {
      hiddenProps.classList.toggle('hidden', expanded);
      btn.textContent = expanded ? 'Show all' : 'Show less';
      btn.dataset.expanded = expanded ? 'false' : 'true';
    }
  });

  // Toggle relationships
  container.querySelector('.toggle-relationships')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    const hiddenRels = container.querySelector('#hidden-relationships');
    const expanded = btn.dataset.expanded === 'true';

    if (hiddenRels) {
      hiddenRels.classList.toggle('hidden', expanded);
      btn.textContent = expanded ? 'Show all' : 'Show less';
      btn.dataset.expanded = expanded ? 'false' : 'true';
    }
  });

  // Navigation links - clicking a relationship navigates to that entity
  container.querySelectorAll('.nav-link').forEach(el => {
    el.addEventListener('click', () => {
      const targetName = (el as HTMLElement).dataset.target;
      if (targetName) {
        store.selectFromDiagram(targetName);
      }
    });
  });

  // Breadcrumb navigation
  container.querySelectorAll('.breadcrumb-link').forEach(el => {
    el.addEventListener('click', () => {
      const index = parseInt((el as HTMLElement).dataset.index || '-1', 10);
      store.navigateToIndex(index);
    });
  });

  // Nested collection links - drill into ComplexType
  container.querySelectorAll('.nested-collection-link').forEach(el => {
    el.addEventListener('click', () => {
      const propertyName = (el as HTMLElement).dataset.property;
      const typeName = (el as HTMLElement).dataset.type;
      if (propertyName && typeName) {
        store.navigateInto(propertyName, typeName);
      }
    });
  });
}
