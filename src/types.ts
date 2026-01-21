// OData v4 Metadata Types

export interface ODataProperty {
  name: string;
  type: string;
  nullable: boolean;
  isKey: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ODataNavigationProperty {
  name: string;
  type: string; // Full type including Collection()
  targetEntity: string; // Just the entity name
  isCollection: boolean;
  partner?: string;
  referentialConstraints?: {
    property: string;
    referencedProperty: string;
  }[];
}

export interface ODataEntity {
  name: string;
  fullName: string; // Namespace.EntityName
  namespace: string;
  properties: ODataProperty[];
  navigationProperties: ODataNavigationProperty[];
  keyProperties: string[];
  baseType?: string;
}

export interface ODataEnumMember {
  name: string;
  value?: string | number;
}

export interface ODataEnumType {
  name: string;
  fullName: string;
  namespace: string;
  members: ODataEnumMember[];
  underlyingType?: string;
  isFlags: boolean;
}

export interface ODataComplexType {
  name: string;
  fullName: string;
  namespace: string;
  properties: ODataProperty[];
  navigationProperties: ODataNavigationProperty[];
  baseType?: string;
  // Key property name if defined (from E3E:Key attribute)
  keyProperty?: string;
}

// Represents a step in the navigation path (breadcrumb)
export interface NavigationPathStep {
  // 'entity' for top-level EntityType, 'complex' for ComplexType
  kind: 'entity' | 'complex';
  // The type name (e.g., 'EntityPerson', 'c_Relate')
  typeName: string;
  // The property name used to navigate here (empty for root)
  propertyName: string;
  // Display label
  displayName: string;
}

export interface ODataSchema {
  namespace: string;
  alias?: string;
  entities: ODataEntity[];
  complexTypes: ODataComplexType[];
  enumTypes: ODataEnumType[];
}

export interface ODataMetadata {
  version: string;
  schemas: ODataSchema[];
  allEntities: ODataEntity[];
  allComplexTypes: ODataComplexType[];
  allEnumTypes: ODataEnumType[];
}

// Relationship for diagram
export interface EntityRelationship {
  sourceEntity: string;
  targetEntity: string;
  navigationProperty: string;
  isCollection: boolean;
  partner?: string;
}

// App State
export interface AppState {
  metadata: ODataMetadata | null;
  selectedEntity: ODataEntity | null;
  searchQuery: string;
  error: string | null;
  loading: boolean;
  // Sidebar: collapsed namespaces
  collapsedNamespaces: Set<string>;
  // Diagram: root entity (stays centered) and which nodes are expanded
  diagramRootEntity: ODataEntity | null;
  diagramExpandedNodes: Set<string>;
  // Navigation path for drilling into ComplexTypes (breadcrumb trail)
  navigationPath: NavigationPathStep[];
}
