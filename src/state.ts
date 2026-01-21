import type { AppState, ODataEntity, ODataMetadata, ODataComplexType, NavigationPathStep } from './types';

type Listener = () => void;

class Store {
  private state: AppState = {
    metadata: null,
    selectedEntity: null,
    searchQuery: '',
    error: null,
    loading: false,
    // Sidebar: collapsed namespaces
    collapsedNamespaces: new Set<string>(),
    // Diagram: root entity and expanded nodes
    diagramRootEntity: null,
    diagramExpandedNodes: new Set<string>(),
    // Navigation path for drilling into ComplexTypes
    navigationPath: [],
  };

  private listeners: Set<Listener> = new Set();

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  setMetadata(metadata: ODataMetadata | null): void {
    this.state = {
      ...this.state,
      metadata,
      selectedEntity: null,
      error: null,
      collapsedNamespaces: new Set<string>(),
      diagramRootEntity: null,
      diagramExpandedNodes: new Set<string>(),
    };
    this.notify();
  }

  selectEntity(entity: ODataEntity | null): void {
    // If this is the first selection, also set as diagram root
    const diagramRoot = this.state.diagramRootEntity || entity;
    const expandedNodes = this.state.diagramExpandedNodes.size > 0 
      ? this.state.diagramExpandedNodes 
      : (entity ? new Set([entity.name]) : new Set<string>());

    this.state = {
      ...this.state,
      selectedEntity: entity,
      diagramRootEntity: diagramRoot,
      diagramExpandedNodes: expandedNodes,
      // Clear navigation path when selecting a new entity
      navigationPath: [],
    };
    this.notify();
  }

  // Start fresh diagram exploration from an entity
  startDiagramFrom(entity: ODataEntity): void {
    this.state = {
      ...this.state,
      selectedEntity: entity,
      diagramRootEntity: entity,
      diagramExpandedNodes: new Set([entity.name]),
      navigationPath: [],
    };
    this.notify();
  }

  // Toggle expand/collapse of a node in the diagram
  toggleDiagramNode(entityName: string): void {
    const newExpanded = new Set(this.state.diagramExpandedNodes);
    if (newExpanded.has(entityName)) {
      newExpanded.delete(entityName);
    } else {
      newExpanded.add(entityName);
    }
    this.state = {
      ...this.state,
      diagramExpandedNodes: newExpanded,
    };
    this.notify();
  }

  // Select entity from diagram click (also expands it)
  selectFromDiagram(entityName: string): void {
    if (!this.state.metadata) return;
    
    const entity = this.state.metadata.allEntities.find(e => e.name === entityName);
    if (!entity) return;

    // Expand the clicked node and select it
    const newExpanded = new Set(this.state.diagramExpandedNodes);
    newExpanded.add(entityName);

    this.state = {
      ...this.state,
      selectedEntity: entity,
      diagramExpandedNodes: newExpanded,
    };
    this.notify();
  }

  // Reset diagram to just the root
  resetDiagram(): void {
    const root = this.state.diagramRootEntity;
    this.state = {
      ...this.state,
      diagramExpandedNodes: root ? new Set([root.name]) : new Set<string>(),
    };
    this.notify();
  }

  setSearchQuery(query: string): void {
    this.state = {
      ...this.state,
      searchQuery: query,
    };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = {
      ...this.state,
      error,
      loading: false,
    };
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state = {
      ...this.state,
      loading,
    };
    this.notify();
  }

  toggleNamespaceCollapsed(namespace: string): void {
    const newCollapsed = new Set(this.state.collapsedNamespaces);
    if (newCollapsed.has(namespace)) {
      newCollapsed.delete(namespace);
    } else {
      newCollapsed.add(namespace);
    }
    this.state = {
      ...this.state,
      collapsedNamespaces: newCollapsed,
    };
    this.notify();
  }

  getFilteredEntities(): ODataEntity[] {
    if (!this.state.metadata) return [];
    const query = this.state.searchQuery.toLowerCase().trim();
    if (!query) return this.state.metadata.allEntities;
    
    return this.state.metadata.allEntities.filter((entity) => {
      // Search entity name
      if (entity.name.toLowerCase().includes(query)) return true;
      
      // Search namespace
      if (entity.namespace.toLowerCase().includes(query)) return true;
      
      // Search full name
      if (entity.fullName.toLowerCase().includes(query)) return true;
      
      // Search property names
      if (entity.properties.some(p => p.name.toLowerCase().includes(query))) return true;
      
      // Search property types (e.g., "Guid", "DateTimeOffset", "Collection")
      if (entity.properties.some(p => p.type.toLowerCase().includes(query))) return true;
      
      // Search navigation property names
      if (entity.navigationProperties.some(np => np.name.toLowerCase().includes(query))) return true;
      
      // Search navigation property target entities
      if (entity.navigationProperties.some(np => np.targetEntity.toLowerCase().includes(query))) return true;
      
      // Search key properties
      if (entity.keyProperties.some(k => k.toLowerCase().includes(query))) return true;
      
      // Search base type
      if (entity.baseType && entity.baseType.toLowerCase().includes(query)) return true;
      
      return false;
    });
  }

  // Group entities by namespace
  getEntitiesByNamespace(): Map<string, ODataEntity[]> {
    const entities = this.getFilteredEntities();
    const grouped = new Map<string, ODataEntity[]>();
    
    for (const entity of entities) {
      const ns = entity.namespace || 'Default';
      if (!grouped.has(ns)) {
        grouped.set(ns, []);
      }
      grouped.get(ns)!.push(entity);
    }
    
    return grouped;
  }

  // ============================================
  // Navigation Path Methods (for ComplexType drilling)
  // ============================================

  /**
   * Navigate into a nested ComplexType from a collection property
   * @param propertyName The property name that holds the collection
   * @param targetTypeName The ComplexType name to navigate into
   */
  navigateInto(propertyName: string, targetTypeName: string): void {
    if (!this.state.metadata) return;

    // Find the target ComplexType
    const complexType = this.state.metadata.allComplexTypes.find(
      ct => ct.name === targetTypeName || ct.fullName.endsWith(`.${targetTypeName}`)
    );
    if (!complexType) return;

    // Build display name (strip c_ prefix if present)
    const displayName = targetTypeName.replace(/^c_/, '');

    const newStep: NavigationPathStep = {
      kind: 'complex',
      typeName: targetTypeName,
      propertyName,
      displayName,
    };

    this.state = {
      ...this.state,
      navigationPath: [...this.state.navigationPath, newStep],
    };
    this.notify();
  }

  /**
   * Navigate back one level in the path
   */
  navigateBack(): void {
    if (this.state.navigationPath.length === 0) return;

    this.state = {
      ...this.state,
      navigationPath: this.state.navigationPath.slice(0, -1),
    };
    this.notify();
  }

  /**
   * Navigate to a specific index in the path (for breadcrumb clicks)
   * @param index The index to navigate to (-1 means back to root entity)
   */
  navigateToIndex(index: number): void {
    if (index < -1) return;

    if (index === -1) {
      // Go back to root entity
      this.state = {
        ...this.state,
        navigationPath: [],
      };
    } else {
      // Navigate to specific step
      this.state = {
        ...this.state,
        navigationPath: this.state.navigationPath.slice(0, index + 1),
      };
    }
    this.notify();
  }

  /**
   * Get the current view type (either the selected entity or a ComplexType from the path)
   */
  getCurrentViewType(): { kind: 'entity'; data: ODataEntity } | { kind: 'complex'; data: ODataComplexType } | null {
    if (!this.state.metadata) return null;

    // If we have a navigation path, return the last ComplexType
    if (this.state.navigationPath.length > 0) {
      const lastStep = this.state.navigationPath[this.state.navigationPath.length - 1];
      const complexType = this.state.metadata.allComplexTypes.find(
        ct => ct.name === lastStep.typeName || ct.fullName.endsWith(`.${lastStep.typeName}`)
      );
      if (complexType) {
        return { kind: 'complex', data: complexType };
      }
    }

    // Otherwise return the selected entity
    if (this.state.selectedEntity) {
      return { kind: 'entity', data: this.state.selectedEntity };
    }

    return null;
  }

  /**
   * Get a ComplexType by name
   */
  getComplexType(name: string): ODataComplexType | null {
    if (!this.state.metadata) return null;
    return this.state.metadata.allComplexTypes.find(
      ct => ct.name === name || ct.fullName.endsWith(`.${name}`)
    ) || null;
  }

  /**
   * Check if a property type is a ComplexType collection
   */
  isComplexTypeCollection(propertyType: string): { isCollection: boolean; typeName: string | null } {
    const collectionMatch = propertyType.match(/^Collection\((.+)\)$/);
    if (!collectionMatch) {
      return { isCollection: false, typeName: null };
    }

    const innerType = collectionMatch[1];
    // Check if it's a ComplexType (typically starts with c_ or is in the allComplexTypes)
    if (!this.state.metadata) {
      return { isCollection: true, typeName: null };
    }

    const typeName = innerType.split('.').pop() || innerType;
    const isComplex = this.state.metadata.allComplexTypes.some(
      ct => ct.name === typeName || ct.fullName === innerType
    );

    return { isCollection: true, typeName: isComplex ? typeName : null };
  }
}

export const store = new Store();
