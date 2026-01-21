import { store } from '../state';
import type { ODataEntity } from '../types';
import { debounce, formatNumber } from '../lib';

/**
 * Get a hint about what matched in the search
 */
function getMatchHint(entity: ODataEntity, query: string): string | null {
  if (!query) return null;
  const q = query.toLowerCase();
  
  // Don't show hint if name matches directly
  if (entity.name.toLowerCase().includes(q)) return null;
  
  // Check properties
  const matchedProp = entity.properties.find(p => p.name.toLowerCase().includes(q));
  if (matchedProp) return `prop: ${matchedProp.name}`;
  
  // Check property types
  const matchedType = entity.properties.find(p => p.type.toLowerCase().includes(q));
  if (matchedType) return `type: ${matchedType.type.replace('Edm.', '')}`;
  
  // Check nav property names
  const matchedNav = entity.navigationProperties.find(np => np.name.toLowerCase().includes(q));
  if (matchedNav) return `nav: ${matchedNav.name}`;
  
  // Check nav property targets
  const matchedTarget = entity.navigationProperties.find(np => np.targetEntity.toLowerCase().includes(q));
  if (matchedTarget) return `→ ${matchedTarget.targetEntity}`;
  
  // Check namespace
  if (entity.namespace.toLowerCase().includes(q)) return `ns: ${entity.namespace}`;
  
  // Check key properties
  const matchedKey = entity.keyProperties.find(k => k.toLowerCase().includes(q));
  if (matchedKey) return `key: ${matchedKey}`;
  
  return null;
}

export function createSidebar(): HTMLElement {
  const sidebar = document.createElement('div');
  sidebar.className = 'bg-base-100 rounded-box shadow-sm flex flex-col h-full overflow-hidden';
  sidebar.innerHTML = `
    <div class="p-3 border-b border-base-200 flex-shrink-0">
      <div class="relative">
        <input 
          type="text" 
          id="entity-search" 
          placeholder="Search names, properties, types..." 
          class="input input-sm input-bordered w-full pl-9"
          spellcheck="false"
          autocomplete="off" />
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button id="clear-search" class="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2 hidden">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div id="namespace-list" class="flex-1 overflow-y-auto">
      <!-- Namespace groups will be rendered here -->
    </div>
    <div id="entity-count" class="p-3 border-t border-base-200 text-xs text-base-content/60 flex-shrink-0">
      No entities loaded
    </div>
  `;

  const searchInput = sidebar.querySelector('#entity-search') as HTMLInputElement;
  const clearSearchBtn = sidebar.querySelector('#clear-search') as HTMLElement;
  const namespaceList = sidebar.querySelector('#namespace-list') as HTMLElement;
  const countDisplay = sidebar.querySelector('#entity-count')!;

  // Debounced search
  const debouncedSearch = debounce((value: string) => {
    store.setSearchQuery(value);
  }, 200);

  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    clearSearchBtn.classList.toggle('hidden', !value);
    debouncedSearch(value);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    store.setSearchQuery('');
    searchInput.focus();
  });

  const renderNamespaceList = () => {
    const state = store.getState();

    if (!state.metadata) {
      namespaceList.innerHTML = `
        <div class="p-6 text-center text-base-content/50">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p class="font-medium">No metadata loaded</p>
          <p class="text-sm mt-1">Parse OData metadata to see entities</p>
        </div>
      `;
      countDisplay.textContent = 'No entities loaded';
      return;
    }

    const grouped = store.getEntitiesByNamespace();
    
    if (grouped.size === 0) {
      namespaceList.innerHTML = `
        <div class="p-6 text-center text-base-content/50">
          <p>No entities match your search</p>
        </div>
      `;
      countDisplay.textContent = `0 of ${formatNumber(state.metadata.allEntities.length)} entities`;
      return;
    }

    // Sort namespaces alphabetically
    const sortedNamespaces = Array.from(grouped.keys()).sort();
    
    let html = '';
    for (const namespace of sortedNamespaces) {
      const entities = grouped.get(namespace)!;
      const isCollapsed = state.collapsedNamespaces.has(namespace);
      const entityCount = entities.length;
      
      html += `
        <div class="border-b border-base-200 last:border-b-0">
          <button 
            class="namespace-header w-full px-3 py-2 flex items-center gap-2 hover:bg-base-200 text-left"
            data-namespace="${namespace}">
            <svg xmlns="http://www.w3.org/2000/svg" 
              class="h-4 w-4 text-base-content/50 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="flex-1 font-medium text-sm truncate">${namespace}</span>
            <span class="badge badge-sm badge-ghost">${entityCount}</span>
          </button>
          <div class="namespace-entities ${isCollapsed ? 'hidden' : ''}">
            ${renderEntityList(entities, state.selectedEntity?.name, state.searchQuery)}
          </div>
        </div>
      `;
    }

    namespaceList.innerHTML = html;

    // Attach namespace toggle handlers
    namespaceList.querySelectorAll('.namespace-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const ns = (btn as HTMLElement).dataset.namespace;
        if (ns) {
          store.toggleNamespaceCollapsed(ns);
        }
      });
    });

    // Attach entity click handlers
    namespaceList.querySelectorAll('.entity-item').forEach(el => {
      el.addEventListener('click', () => {
        const entityName = (el as HTMLElement).dataset.entity;
        if (entityName && state.metadata) {
          const entity = state.metadata.allEntities.find(e => e.name === entityName);
          if (entity) {
            // Always start fresh diagram from clicked entity
            store.startDiagramFrom(entity);
          }
        }
      });
    });

    // Update count
    const totalCount = state.metadata.allEntities.length;
    const filteredCount = store.getFilteredEntities().length;
    const relationshipCount = state.metadata.allEntities.reduce(
      (sum, e) => sum + e.navigationProperties.length, 0
    );

    if (state.searchQuery) {
      countDisplay.textContent = `${formatNumber(filteredCount)} of ${formatNumber(totalCount)} entities`;
    } else {
      countDisplay.innerHTML = `
        <span>${formatNumber(totalCount)} entities</span>
        <span class="mx-1">·</span>
        <span>${formatNumber(relationshipCount)} relationships</span>
      `;
    }
  };

  const renderEntityList = (entities: ODataEntity[], selectedName?: string, searchQuery?: string): string => {
    // Sort entities alphabetically
    const sorted = [...entities].sort((a, b) => a.name.localeCompare(b.name));
    
    return sorted.map(entity => {
      const isSelected = entity.name === selectedName;
      const navCount = entity.navigationProperties.length;
      const hint = searchQuery ? getMatchHint(entity, searchQuery) : null;
      
      return `
        <div 
          class="entity-item px-3 py-1.5 pl-9 flex items-center gap-2 cursor-pointer hover:bg-base-200 ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''}"
          data-entity="${entity.name}">
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">${entity.name}</div>
            ${hint ? `<div class="text-xs text-accent truncate">${hint}</div>` : ''}
          </div>
          ${navCount > 0 ? `<span class="badge badge-xs badge-primary badge-outline flex-shrink-0">${navCount}</span>` : ''}
        </div>
      `;
    }).join('');
  };

  // Subscribe to state changes
  store.subscribe(renderNamespaceList);

  // Initial render
  renderNamespaceList();

  return sidebar;
}
