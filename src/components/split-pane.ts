// Resizable split pane component
export function createSplitPane(
  leftPanel: HTMLElement,
  rightPanel: HTMLElement,
  options: {
    initialLeftWidth?: number; // percentage
    minLeftWidth?: number; // percentage
    maxLeftWidth?: number; // percentage
  } = {}
): HTMLElement {
  const {
    initialLeftWidth = 50,
    minLeftWidth = 25,
    maxLeftWidth = 75,
  } = options;

  const container = document.createElement('div');
  container.className = 'split-pane flex h-full w-full overflow-hidden';

  const leftWrapper = document.createElement('div');
  leftWrapper.className = 'split-left h-full overflow-hidden';
  leftWrapper.style.width = `${initialLeftWidth}%`;
  leftWrapper.appendChild(leftPanel);

  const divider = document.createElement('div');
  divider.className = 'split-divider w-1 bg-base-300 hover:bg-primary cursor-col-resize flex-shrink-0 transition-colors';
  divider.innerHTML = `
    <div class="h-full flex items-center justify-center">
      <div class="w-0.5 h-8 bg-base-content/20 rounded-full"></div>
    </div>
  `;

  const rightWrapper = document.createElement('div');
  rightWrapper.className = 'split-right h-full overflow-hidden flex-1';
  rightWrapper.appendChild(rightPanel);

  container.appendChild(leftWrapper);
  container.appendChild(divider);
  container.appendChild(rightWrapper);

  // Drag to resize
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startWidth = leftWrapper.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    divider.classList.add('bg-primary');
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const containerWidth = container.offsetWidth;
    const delta = e.clientX - startX;
    const newWidth = startWidth + delta;
    const newPercent = (newWidth / containerWidth) * 100;
    
    // Clamp to min/max
    const clampedPercent = Math.min(maxLeftWidth, Math.max(minLeftWidth, newPercent));
    leftWrapper.style.width = `${clampedPercent}%`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      divider.classList.remove('bg-primary');
    }
  });

  return container;
}
