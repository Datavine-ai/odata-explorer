import * as d3 from 'd3';
import { store } from '../state';
import type { ODataEntity, ODataMetadata, ODataComplexType } from '../types';

interface DiagramNode {
  id: string;
  name: string;
  displayName: string;
  // Either an entity or complexType
  entity?: ODataEntity;
  complexType?: ODataComplexType;
  kind: 'entity' | 'complex';
  isRoot: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  relationshipCount: number;
  collectionCount: number; // nested collection properties
  depth: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

interface DiagramLink {
  source: DiagramNode;
  target: DiagramNode;
  isCollection: boolean;
  isNested: boolean; // true if it's a nested ComplexType collection
  navProperty: string;
}

const NODE_HEIGHT = 28;
const NODE_PADDING = 12;
const CHAR_WIDTH = 7;
const LEVEL_HEIGHT = 80;
const NODE_SPACING = 20;

function calculateNodeWidth(name: string): number {
  return Math.max(60, name.length * CHAR_WIDTH + NODE_PADDING * 2);
}

export function createDiagram(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'bg-base-100 rounded-box shadow-sm h-full overflow-hidden flex flex-col';

  container.innerHTML = `
    <div class="p-3 border-b border-base-200 flex items-center justify-between bg-base-200/30 flex-shrink-0">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold">Relationship Graph</h3>
        <span id="node-count" class="badge badge-sm badge-ghost"></span>
      </div>
      <div class="flex items-center gap-1">
        <button id="reset-diagram" class="btn btn-xs btn-ghost" title="Reset to root entity">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button id="zoom-in" class="btn btn-xs btn-ghost" title="Zoom In">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button id="zoom-out" class="btn btn-xs btn-ghost" title="Zoom Out">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button id="zoom-fit" class="btn btn-xs btn-ghost" title="Fit to view">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
    <div id="diagram-container" class="flex-1 relative overflow-hidden">
      <svg id="diagram-svg" class="w-full h-full"></svg>
      <div id="diagram-tooltip" class="absolute hidden bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 text-xs pointer-events-none z-10 max-w-xs"></div>
    </div>
    <div id="diagram-legend" class="p-2 border-t border-base-200 text-xs flex-shrink-0 flex items-center justify-center gap-4 text-base-content/60 flex-wrap">
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-primary"></span> Root Entity
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-secondary"></span> Selected
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded bg-accent"></span> ComplexType
      </span>
      <span class="flex items-center gap-1">
        <span class="w-3 h-3 rounded border-2 border-info bg-base-100"></span> Expanded
      </span>
      <span>Click to expand/select</span>
    </div>
  `;

  const svgElement = container.querySelector('#diagram-svg') as SVGSVGElement;
  const tooltipEl = container.querySelector('#diagram-tooltip') as HTMLElement;
  const diagramContainer = container.querySelector('#diagram-container') as HTMLElement;
  const nodeCountEl = container.querySelector('#node-count') as HTMLElement;

  let currentZoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

  const render = () => {
    const state = store.getState();
    const { metadata, diagramRootEntity, selectedEntity, diagramExpandedNodes } = state;

    // Clear SVG
    d3.select(svgElement).selectAll('*').remove();

    const width = diagramContainer.clientWidth;
    const height = diagramContainer.clientHeight;

    if (width === 0 || height === 0) {
      setTimeout(render, 100);
      return;
    }

    if (!metadata) {
      nodeCountEl.textContent = '';
      renderEmptyState(width, height, 'No metadata loaded', 'Parse OData metadata to explore relationships');
      return;
    }

    if (!diagramRootEntity) {
      nodeCountEl.textContent = '';
      renderEmptyState(width, height, 'Select an entity', 'Click an entity from the sidebar to start exploring');
      return;
    }

    renderGraph(width, height, metadata, diagramRootEntity, selectedEntity, diagramExpandedNodes);
  };

  const renderEmptyState = (width: number, height: number, title: string, subtitle: string) => {
    const svg = d3.select(svgElement).attr('width', width).attr('height', height);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2 - 10)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-base-content/50')
      .style('font-size', '14px')
      .text(title);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2 + 15)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-base-content/30')
      .style('font-size', '12px')
      .text(subtitle);
  };

  const renderGraph = (
    width: number,
    height: number,
    metadata: ODataMetadata,
    rootEntity: ODataEntity,
    selectedEntity: ODataEntity | null,
    expandedNodes: Set<string>
  ) => {
    const entityMap = new Map(metadata.allEntities.map(e => [e.name, e]));
    const { nodes, links } = buildGraph(rootEntity, selectedEntity, expandedNodes, entityMap, metadata);

    if (nodes.length === 0) return;

    layoutNodes(nodes);
    const bounds = getBounds(nodes);

    nodeCountEl.textContent = `${nodes.length} nodes`;

    const svg = d3.select(svgElement).attr('width', width).attr('height', height);
    const g = svg.append('g');

    // Setup zoom
    currentZoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(currentZoom);

    // Fit to view
    const padding = 40;
    const graphWidth = bounds.maxX - bounds.minX + padding * 2;
    const graphHeight = bounds.maxY - bounds.minY + padding * 2;
    const scale = Math.min(width / graphWidth, height / graphHeight, 1.5);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const initialTransform = d3.zoomIdentity
      .translate(width / 2 - centerX * scale, height / 2 - centerY * scale)
      .scale(scale);
    svg.call(currentZoom.transform, initialTransform);

    // Arrow markers
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow-single')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L10,0L0,4').attr('fill', 'oklch(var(--bc) / 0.4)');

    defs.append('marker')
      .attr('id', 'arrow-collection')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L10,0L0,4').attr('fill', 'oklch(var(--s))');

    defs.append('marker')
      .attr('id', 'arrow-nested')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L10,0L0,4').attr('fill', 'oklch(var(--a))');

    // Draw links
    g.append('g').attr('class', 'links').selectAll('path')
      .data(links)
      .enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', d => {
        if (d.isNested) return 'oklch(var(--a))';
        if (d.isCollection) return 'oklch(var(--s))';
        return 'oklch(var(--bc) / 0.3)';
      })
      .attr('stroke-width', d => (d.isCollection || d.isNested) ? 2 : 1.5)
      .attr('stroke-dasharray', d => d.isNested ? '3,3' : d.isCollection ? '5,3' : 'none')
      .attr('marker-end', d => {
        if (d.isNested) return 'url(#arrow-nested)';
        if (d.isCollection) return 'url(#arrow-collection)';
        return 'url(#arrow-single)';
      })
      .attr('d', d => {
        const src = getRectEdgePoint(d.source, d.target);
        const tgt = getRectEdgePoint(d.target, d.source);
        return `M${src.x},${src.y}L${tgt.x},${tgt.y}`;
      });

    // Draw nodes
    const node = g.append('g').attr('class', 'nodes').selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'cursor-pointer')
      .attr('transform', d => `translate(${d.x},${d.y})`);

    // Node rectangles - different colors for Entity vs ComplexType
    node.append('rect')
      .attr('x', d => -d.width / 2)
      .attr('y', -NODE_HEIGHT / 2)
      .attr('width', d => d.width)
      .attr('height', NODE_HEIGHT)
      .attr('rx', d => d.kind === 'complex' ? 8 : 4) // Rounded corners for ComplexTypes
      .attr('ry', d => d.kind === 'complex' ? 8 : 4)
      .attr('fill', d => {
        if (d.isRoot) return 'oklch(var(--p))';
        if (d.isSelected) return 'oklch(var(--s))';
        if (d.kind === 'complex') return 'oklch(var(--a) / 0.15)';
        return 'oklch(var(--b1))';
      })
      .attr('stroke', d => {
        if (d.isRoot) return 'oklch(var(--pf))';
        if (d.isSelected) return 'oklch(var(--sf))';
        if (d.kind === 'complex') return 'oklch(var(--a))';
        if (d.isExpanded) return 'oklch(var(--in))';
        return 'oklch(var(--bc) / 0.3)';
      })
      .attr('stroke-width', d => (d.isRoot || d.isSelected || d.isExpanded || d.kind === 'complex') ? 2 : 1);

    // Node labels
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => {
        if (d.isRoot || d.isSelected) return 'oklch(var(--pc))';
        if (d.kind === 'complex') return 'oklch(var(--a))';
        return 'oklch(var(--bc))';
      })
      .style('font-size', '11px')
      .style('font-weight', d => (d.isRoot || d.isSelected || d.kind === 'complex') ? '600' : '500')
      .style('pointer-events', 'none')
      .text(d => d.displayName);

    // Expand/collapse badge - show if there are relationships OR nested collections
    node.filter(d => !d.isRoot && (d.relationshipCount > 0 || d.collectionCount > 0))
      .append('circle')
      .attr('cx', d => d.width / 2 - 2)
      .attr('cy', -NODE_HEIGHT / 2 + 2)
      .attr('r', 8)
      .attr('fill', d => d.isExpanded ? 'oklch(var(--wa))' : 'oklch(var(--in))');

    node.filter(d => !d.isRoot && (d.relationshipCount > 0 || d.collectionCount > 0))
      .append('text')
      .attr('x', d => d.width / 2 - 2)
      .attr('y', -NODE_HEIGHT / 2 + 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => d.isExpanded ? 'oklch(var(--wac))' : 'oklch(var(--inc))')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .text(d => d.isExpanded ? '-' : '+');

    // Hover
    node.on('mouseenter', function(event, d) {
      d3.select(this).select('rect').attr('stroke-width', 3);
      const rect = diagramContainer.getBoundingClientRect();
      const typeLabel = d.kind === 'complex' ? 'ComplexType' : 'Entity';
      tooltipEl.innerHTML = `
        <div class="font-semibold">${d.displayName}</div>
        <div class="text-base-content/60 mt-1">${typeLabel}</div>
        <div class="text-base-content/60">${d.relationshipCount} nav props, ${d.collectionCount} collections</div>
        ${d.isRoot ? '<div class="text-primary mt-1">Root entity</div>' : ''}
      `;
      tooltipEl.style.left = `${event.clientX - rect.left + 15}px`;
      tooltipEl.style.top = `${event.clientY - rect.top + 15}px`;
      tooltipEl.classList.remove('hidden');
    });

    node.on('mouseleave', function(_, d) {
      d3.select(this).select('rect').attr('stroke-width', (d.isRoot || d.isSelected || d.isExpanded) ? 2 : 1);
      tooltipEl.classList.add('hidden');
    });

    // Click
    node.on('click', (event, d) => {
      event.stopPropagation();
      tooltipEl.classList.add('hidden');
      
      if (d.kind === 'entity') {
        if (d.isRoot && d.entity) {
          store.selectEntity(d.entity);
        } else if (d.isExpanded) {
          store.toggleDiagramNode(d.name);
        } else {
          store.selectFromDiagram(d.name);
        }
      } else {
        // ComplexType clicked
        if (d.isExpanded) {
          store.toggleDiagramNode(d.name);
        } else {
          // Expand it
          store.toggleDiagramNode(d.name);
        }
      }
    });
  };

  const buildGraph = (
    rootEntity: ODataEntity,
    selectedEntity: ODataEntity | null,
    expandedNodes: Set<string>,
    entityMap: Map<string, ODataEntity>,
    metadata: ODataMetadata
  ): { nodes: DiagramNode[], links: DiagramLink[] } => {
    const nodes: DiagramNode[] = [];
    const links: DiagramLink[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map<string, DiagramNode>();

    // Create a map of ComplexTypes
    const complexTypeMap = new Map(metadata.allComplexTypes.map(ct => [ct.name, ct]));

    // Helper to get collection ComplexTypes from properties
    const getNestedCollections = (props: { name: string; type: string }[]) => {
      const result: { propName: string; typeName: string }[] = [];
      for (const prop of props) {
        const check = store.isComplexTypeCollection(prop.type);
        if (check.isCollection && check.typeName) {
          result.push({ propName: prop.name, typeName: check.typeName });
        }
      }
      return result;
    };

    // Queue can hold either entities or complex types
    type QueueItem = 
      | { kind: 'entity'; entity: ODataEntity; depth: number; parentProp?: string }
      | { kind: 'complex'; complexType: ODataComplexType; depth: number; parentProp: string };
    
    const queue: QueueItem[] = [{ kind: 'entity', entity: rootEntity, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      
      if (item.kind === 'entity') {
        const { entity, depth } = item;
        if (visited.has(entity.name)) continue;
        visited.add(entity.name);

        const isRoot = entity.name === rootEntity.name;
        const isExpanded = expandedNodes.has(entity.name);
        const isSelected = selectedEntity?.name === entity.name;
        const nestedCollections = getNestedCollections(entity.properties);

        const node: DiagramNode = {
          id: entity.name,
          name: entity.name,
          displayName: entity.name,
          entity,
          kind: 'entity',
          isRoot,
          isSelected,
          isExpanded,
          relationshipCount: entity.navigationProperties.length,
          collectionCount: nestedCollections.length,
          depth,
          width: calculateNodeWidth(entity.name),
          height: NODE_HEIGHT,
          x: 0,
          y: 0,
        };

        nodes.push(node);
        nodeMap.set(entity.name, node);

        if (isExpanded || isRoot) {
          const maxChildren = isRoot ? 15 : 8;
          let childCount = 0;

          // Add navigation property targets (EntityTypes)
          for (const nav of entity.navigationProperties) {
            if (childCount >= maxChildren) break;
            const targetEntity = entityMap.get(nav.targetEntity);
            if (targetEntity && !visited.has(nav.targetEntity)) {
              queue.push({ kind: 'entity', entity: targetEntity, depth: depth + 1 });
              childCount++;
            }
          }

          // Add nested collection ComplexTypes
          for (const nested of nestedCollections) {
            if (childCount >= maxChildren) break;
            const complexType = complexTypeMap.get(nested.typeName);
            if (complexType && !visited.has(nested.typeName)) {
              queue.push({ kind: 'complex', complexType, depth: depth + 1, parentProp: nested.propName });
              childCount++;
            }
          }
        }
      } else {
        // ComplexType
        const { complexType, depth } = item;
        if (visited.has(complexType.name)) continue;
        visited.add(complexType.name);

        const isExpanded = expandedNodes.has(complexType.name);
        const nestedCollections = getNestedCollections(complexType.properties);
        const displayName = complexType.name.replace(/^c_/, '');

        const node: DiagramNode = {
          id: complexType.name,
          name: complexType.name,
          displayName,
          complexType,
          kind: 'complex',
          isRoot: false,
          isSelected: false,
          isExpanded,
          relationshipCount: complexType.navigationProperties.length,
          collectionCount: nestedCollections.length,
          depth,
          width: calculateNodeWidth(displayName),
          height: NODE_HEIGHT,
          x: 0,
          y: 0,
        };

        nodes.push(node);
        nodeMap.set(complexType.name, node);

        if (isExpanded) {
          const maxChildren = 6;
          let childCount = 0;

          // Add nested collection ComplexTypes
          for (const nested of nestedCollections) {
            if (childCount >= maxChildren) break;
            const nestedType = complexTypeMap.get(nested.typeName);
            if (nestedType && !visited.has(nested.typeName)) {
              queue.push({ kind: 'complex', complexType: nestedType, depth: depth + 1, parentProp: nested.propName });
              childCount++;
            }
          }

          // Add navigation property targets
          for (const nav of complexType.navigationProperties) {
            if (childCount >= maxChildren) break;
            const targetEntity = entityMap.get(nav.targetEntity);
            if (targetEntity && !visited.has(nav.targetEntity)) {
              queue.push({ kind: 'entity', entity: targetEntity, depth: depth + 1 });
              childCount++;
            }
          }
        }
      }
    }

    // Build links
    const linkSet = new Set<string>();
    for (const node of nodes) {
      if (node.isExpanded || node.isRoot) {
        // Get navigation properties
        const navProps = node.kind === 'entity' 
          ? node.entity!.navigationProperties 
          : node.complexType!.navigationProperties;
        
        for (const nav of navProps) {
          const targetNode = nodeMap.get(nav.targetEntity);
          if (targetNode && targetNode !== node) {
            const linkKey = [node.id, targetNode.id].sort().join('|');
            if (!linkSet.has(linkKey)) {
              linkSet.add(linkKey);
              links.push({ 
                source: node, 
                target: targetNode, 
                isCollection: nav.isCollection, 
                isNested: false,
                navProperty: nav.name 
              });
            }
          }
        }

        // Get nested collection links
        const props = node.kind === 'entity' ? node.entity!.properties : node.complexType!.properties;
        const nestedCollections = getNestedCollections(props);
        
        for (const nested of nestedCollections) {
          const targetNode = nodeMap.get(nested.typeName);
          if (targetNode && targetNode !== node) {
            const linkKey = [node.id, targetNode.id].sort().join('|');
            if (!linkSet.has(linkKey)) {
              linkSet.add(linkKey);
              links.push({ 
                source: node, 
                target: targetNode, 
                isCollection: true, 
                isNested: true,
                navProperty: nested.propName 
              });
            }
          }
        }
      }
    }

    return { nodes, links };
  };

  const layoutNodes = (nodes: DiagramNode[]) => {
    const byDepth = new Map<number, DiagramNode[]>();
    for (const node of nodes) {
      if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
      byDepth.get(node.depth)!.push(node);
    }

    for (const [depth, levelNodes] of byDepth) {
      const totalWidth = levelNodes.reduce((sum, n) => sum + n.width + NODE_SPACING, -NODE_SPACING);
      let x = -totalWidth / 2;
      const y = depth * LEVEL_HEIGHT;
      for (const node of levelNodes) {
        node.x = x + node.width / 2;
        node.y = y;
        x += node.width + NODE_SPACING;
      }
    }
  };

  const getBounds = (nodes: DiagramNode[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x - node.width / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      minY = Math.min(minY, node.y - NODE_HEIGHT / 2);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT / 2);
    }
    return { minX, maxX, minY, maxY };
  };

  const getRectEdgePoint = (from: DiagramNode, to: DiagramNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const w = from.width / 2;
    const h = NODE_HEIGHT / 2;
    const tanA = Math.tan(angle);
    let x: number, y: number;

    if (Math.abs(Math.cos(angle)) * h > Math.abs(Math.sin(angle)) * w) {
      x = Math.cos(angle) > 0 ? w : -w;
      y = x * tanA;
    } else {
      y = Math.sin(angle) > 0 ? h : -h;
      x = Math.abs(tanA) > 0.001 ? y / tanA : 0;
    }

    return { x: from.x + x, y: from.y + y };
  };

  // Controls
  container.querySelector('#reset-diagram')?.addEventListener('click', () => store.resetDiagram());
  container.querySelector('#zoom-in')?.addEventListener('click', () => {
    if (currentZoom) d3.select(svgElement).transition().duration(200).call(currentZoom.scaleBy, 1.5);
  });
  container.querySelector('#zoom-out')?.addEventListener('click', () => {
    if (currentZoom) d3.select(svgElement).transition().duration(200).call(currentZoom.scaleBy, 0.67);
  });
  container.querySelector('#zoom-fit')?.addEventListener('click', () => {
    if (currentZoom) d3.select(svgElement).transition().duration(300).call(currentZoom.transform, d3.zoomIdentity);
  });

  store.subscribe(render);

  new ResizeObserver(() => render()).observe(diagramContainer);
  setTimeout(render, 50);

  return container;
}
