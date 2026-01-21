import type {
  ODataMetadata,
  ODataSchema,
  ODataEntity,
  ODataProperty,
  ODataNavigationProperty,
  ODataComplexType,
  ODataEnumType,
  ODataEnumMember,
} from './types';

// XML Namespaces for OData v4
const EDMX_NS = 'http://docs.oasis-open.org/odata/ns/edmx';
const EDM_NS = 'http://docs.oasis-open.org/odata/ns/edm';

/**
 * Parse OData v4 metadata XML into structured TypeScript objects
 */
export function parseODataMetadata(xmlString: string): ODataMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML Parse Error: ${parseError.textContent}`);
  }

  // Get root element - try both namespaced and non-namespaced
  const root = doc.documentElement;
  if (!root || !root.localName.toLowerCase().includes('edmx')) {
    throw new Error('Invalid OData metadata: Root element must be Edmx');
  }

  // Get version
  const version = root.getAttribute('Version') || '4.0';

  // Find DataServices element
  const dataServices = findElement(root, 'DataServices');
  if (!dataServices) {
    throw new Error('Invalid OData metadata: Missing DataServices element');
  }

  // Parse all schemas
  const schemaElements = findElements(dataServices, 'Schema');
  const schemas: ODataSchema[] = schemaElements.map(parseSchema);

  // Flatten all entities, complex types, and enums for easy access
  const allEntities = schemas.flatMap((s) => s.entities);
  const allComplexTypes = schemas.flatMap((s) => s.complexTypes);
  const allEnumTypes = schemas.flatMap((s) => s.enumTypes);

  return {
    version,
    schemas,
    allEntities,
    allComplexTypes,
    allEnumTypes,
  };
}

/**
 * Parse a Schema element
 */
function parseSchema(schemaElement: Element): ODataSchema {
  const namespace = schemaElement.getAttribute('Namespace') || 'Default';
  const alias = schemaElement.getAttribute('Alias') || undefined;

  // Parse EntityTypes
  const entityElements = findElements(schemaElement, 'EntityType');
  const entities: ODataEntity[] = entityElements.map((el) =>
    parseEntityType(el, namespace)
  );

  // Parse ComplexTypes
  const complexTypeElements = findElements(schemaElement, 'ComplexType');
  const complexTypes: ODataComplexType[] = complexTypeElements.map((el) =>
    parseComplexType(el, namespace)
  );

  // Parse EnumTypes
  const enumTypeElements = findElements(schemaElement, 'EnumType');
  const enumTypes: ODataEnumType[] = enumTypeElements.map((el) =>
    parseEnumType(el, namespace)
  );

  return {
    namespace,
    alias,
    entities,
    complexTypes,
    enumTypes,
  };
}

/**
 * Parse an EntityType element
 */
function parseEntityType(entityElement: Element, namespace: string): ODataEntity {
  const name = entityElement.getAttribute('Name') || 'Unknown';
  const baseType = entityElement.getAttribute('BaseType') || undefined;

  // Parse Key
  const keyElement = findElement(entityElement, 'Key');
  const keyProperties: string[] = [];
  if (keyElement) {
    const propertyRefs = findElements(keyElement, 'PropertyRef');
    propertyRefs.forEach((ref) => {
      const keyName = ref.getAttribute('Name');
      if (keyName) keyProperties.push(keyName);
    });
  }

  // Parse Properties
  const propertyElements = findElements(entityElement, 'Property');
  const properties: ODataProperty[] = propertyElements.map((el) =>
    parseProperty(el, keyProperties)
  );

  // Parse NavigationProperties
  const navPropElements = findElements(entityElement, 'NavigationProperty');
  const navigationProperties: ODataNavigationProperty[] = navPropElements.map(
    parseNavigationProperty
  );

  return {
    name,
    fullName: `${namespace}.${name}`,
    namespace,
    properties,
    navigationProperties,
    keyProperties,
    baseType,
  };
}

/**
 * Parse a Property element
 */
function parseProperty(
  propElement: Element,
  keyProperties: string[]
): ODataProperty {
  const name = propElement.getAttribute('Name') || 'Unknown';
  const type = propElement.getAttribute('Type') || 'Edm.String';
  const nullableAttr = propElement.getAttribute('Nullable');
  const nullable = nullableAttr !== 'false'; // Default is true in OData v4
  const maxLength = propElement.getAttribute('MaxLength');
  const precision = propElement.getAttribute('Precision');
  const scale = propElement.getAttribute('Scale');

  return {
    name,
    type,
    nullable,
    isKey: keyProperties.includes(name),
    maxLength: maxLength ? parseInt(maxLength, 10) : undefined,
    precision: precision ? parseInt(precision, 10) : undefined,
    scale: scale ? parseInt(scale, 10) : undefined,
  };
}

/**
 * Parse a NavigationProperty element
 */
function parseNavigationProperty(
  navPropElement: Element
): ODataNavigationProperty {
  const name = navPropElement.getAttribute('Name') || 'Unknown';
  const type = navPropElement.getAttribute('Type') || '';
  const partner = navPropElement.getAttribute('Partner') || undefined;

  // Determine if it's a collection and extract target entity
  const isCollection = type.startsWith('Collection(');
  let targetEntity = type;

  if (isCollection) {
    // Extract from Collection(Namespace.EntityName)
    const match = type.match(/Collection\((.+)\)/);
    if (match) {
      targetEntity = match[1];
    }
  }

  // Get just the entity name (without namespace)
  const parts = targetEntity.split('.');
  targetEntity = parts[parts.length - 1];

  // Parse ReferentialConstraints if present
  const constraintElements = findElements(navPropElement, 'ReferentialConstraint');
  const referentialConstraints = constraintElements.map((el) => ({
    property: el.getAttribute('Property') || '',
    referencedProperty: el.getAttribute('ReferencedProperty') || '',
  }));

  return {
    name,
    type,
    targetEntity,
    isCollection,
    partner,
    referentialConstraints:
      referentialConstraints.length > 0 ? referentialConstraints : undefined,
  };
}

/**
 * Parse a ComplexType element
 */
function parseComplexType(
  complexElement: Element,
  namespace: string
): ODataComplexType {
  const name = complexElement.getAttribute('Name') || 'Unknown';
  const baseType = complexElement.getAttribute('BaseType') || undefined;
  
  // Check for E3E:Key attribute (custom key annotation)
  const keyProperty = complexElement.getAttributeNS('https://www.elite.com/schemas', 'Key') 
    || complexElement.getAttribute('E3E:Key') 
    || undefined;

  const propertyElements = findElements(complexElement, 'Property');
  const properties: ODataProperty[] = propertyElements.map((el) =>
    parseProperty(el, keyProperty ? [keyProperty] : [])
  );

  // Parse NavigationProperties for ComplexTypes (same as EntityTypes)
  const navPropElements = findElements(complexElement, 'NavigationProperty');
  const navigationProperties: ODataNavigationProperty[] = navPropElements.map(
    parseNavigationProperty
  );

  return {
    name,
    fullName: `${namespace}.${name}`,
    namespace,
    properties,
    navigationProperties,
    baseType,
    keyProperty,
  };
}

/**
 * Parse an EnumType element
 */
function parseEnumType(enumElement: Element, namespace: string): ODataEnumType {
  const name = enumElement.getAttribute('Name') || 'Unknown';
  const underlyingType = enumElement.getAttribute('UnderlyingType') || undefined;
  const isFlags = enumElement.getAttribute('IsFlags') === 'true';

  const memberElements = findElements(enumElement, 'Member');
  const members: ODataEnumMember[] = memberElements.map((el) => ({
    name: el.getAttribute('Name') || 'Unknown',
    value: el.getAttribute('Value') || undefined,
  }));

  return {
    name,
    fullName: `${namespace}.${name}`,
    namespace,
    members,
    underlyingType,
    isFlags,
  };
}

/**
 * Helper to find a single child element by local name (ignoring namespace)
 */
function findElement(parent: Element, localName: string): Element | null {
  // Try namespaced first
  let element = parent.getElementsByTagNameNS(EDM_NS, localName)[0];
  if (!element) {
    element = parent.getElementsByTagNameNS(EDMX_NS, localName)[0];
  }
  if (!element) {
    // Try without namespace
    element = parent.getElementsByTagName(localName)[0];
  }
  // Also try with namespace prefix variations
  if (!element) {
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].localName === localName) {
        return children[i];
      }
    }
  }
  return element || null;
}

/**
 * Helper to find all child elements by local name (ignoring namespace)
 */
function findElements(parent: Element, localName: string): Element[] {
  const results: Element[] = [];

  // Try namespaced
  const nsElements = parent.getElementsByTagNameNS(EDM_NS, localName);
  for (let i = 0; i < nsElements.length; i++) {
    results.push(nsElements[i]);
  }

  if (results.length === 0) {
    const edmxElements = parent.getElementsByTagNameNS(EDMX_NS, localName);
    for (let i = 0; i < edmxElements.length; i++) {
      results.push(edmxElements[i]);
    }
  }

  if (results.length === 0) {
    // Try without namespace - only direct children
    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].localName === localName) {
        results.push(children[i]);
      }
    }
  }

  return results;
}

/**
 * Extract all entity relationships for diagram visualization
 */
export function extractRelationships(
  metadata: ODataMetadata
): { sourceEntity: string; targetEntity: string; navProp: string; isCollection: boolean }[] {
  const relationships: {
    sourceEntity: string;
    targetEntity: string;
    navProp: string;
    isCollection: boolean;
  }[] = [];

  const entityNames = new Set(metadata.allEntities.map((e) => e.name));

  for (const entity of metadata.allEntities) {
    for (const navProp of entity.navigationProperties) {
      // Only add if target exists
      if (entityNames.has(navProp.targetEntity)) {
        relationships.push({
          sourceEntity: entity.name,
          targetEntity: navProp.targetEntity,
          navProp: navProp.name,
          isCollection: navProp.isCollection,
        });
      }
    }
  }

  return relationships;
}
