import './style.css';
import { store } from './state';
import { createInputSection } from './components/input';
import { createSidebar } from './components/sidebar';
import { createDetailView } from './components/detail';
import { createDiagram } from './components/diagram';
import { createSplitPane } from './components/split-pane';

function initApp() {
  const app = document.getElementById('app')!;

  // Fixed viewport layout - no page scrolling
  app.innerHTML = `
    <div class="h-screen flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="navbar bg-base-100 shadow-sm border-b border-base-300 px-4 flex-shrink-0">
        <div class="flex-1 gap-3">
          <a href="/" class="flex items-center">
            <img src="/assets/Datavine_Logo.svg" alt="Datavine" class="h-8" id="logo-light" />
            <img src="/assets/Datavine_Logo_White.svg" alt="Datavine" class="h-8 hidden" id="logo-dark" />
          </a>
          <div class="hidden sm:block border-l border-base-300 pl-3">
            <h1 class="text-lg font-semibold text-base-content">OData Schema Viewer</h1>
            <p class="text-xs font-mono text-base-content/60">Visualize entities and relationships</p>
          </div>
        </div>
        <div class="flex-none gap-2">
          <label class="swap swap-rotate btn btn-ghost btn-circle">
            <input type="checkbox" id="theme-toggle" />
            <svg class="swap-on fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/></svg>
            <svg class="swap-off fill-current w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/></svg>
          </label>
        </div>
      </header>

      <!-- Main Content - takes remaining height -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Input Section - collapsible header area -->
        <div id="input-section" class="flex-shrink-0 p-4 pb-0"></div>

        <!-- Error Alert -->
        <div id="error-container" class="hidden flex-shrink-0 px-4 pt-4">
          <div class="alert alert-error shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span id="error-message"></span>
            <button id="dismiss-error" class="btn btn-sm btn-ghost">Dismiss</button>
          </div>
        </div>

        <!-- Loading -->
        <div id="loading-container" class="hidden flex-shrink-0 px-4 pt-4">
          <div class="flex items-center justify-center p-4">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <span class="ml-3">Parsing metadata...</span>
          </div>
        </div>

        <!-- Content Grid: Sidebar + Split Pane - fills remaining space -->
        <div id="content-area" class="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 p-4 min-h-0 overflow-hidden">
          <!-- Sidebar - scrolls internally -->
          <div id="sidebar-container" class="overflow-hidden"></div>

          <!-- Main Panel: Split between Detail and Diagram -->
          <div id="main-panel" class="overflow-hidden"></div>
        </div>
      </main>
    </div>
  `;

  // Mount components
  document.getElementById('input-section')!.appendChild(createInputSection());
  document.getElementById('sidebar-container')!.appendChild(createSidebar());

  const mainPanel = document.getElementById('main-panel')!;
  const detailView = createDetailView();
  const diagramView = createDiagram();

  // Create split pane with detail on left (55%) and diagram on right (45%)
  const splitPane = createSplitPane(detailView, diagramView, {
    initialLeftWidth: 55,
    minLeftWidth: 30,
    maxLeftWidth: 70,
  });

  mainPanel.appendChild(splitPane);

  // Error handling
  const errorContainer = document.getElementById('error-container')!;
  const errorMessage = document.getElementById('error-message')!;
  const dismissError = document.getElementById('dismiss-error')!;

  dismissError.addEventListener('click', () => {
    store.setError(null);
  });

  const updateError = () => {
    const state = store.getState();
    if (state.error) {
      errorContainer.classList.remove('hidden');
      errorMessage.textContent = state.error;
    } else {
      errorContainer.classList.add('hidden');
    }
  };

  store.subscribe(updateError);

  // Loading state
  const loadingContainer = document.getElementById('loading-container')!;

  const updateLoading = () => {
    const state = store.getState();
    loadingContainer.classList.toggle('hidden', !state.loading);
  };

  store.subscribe(updateLoading);

  // Theme toggle - switch between datavine and datavine-dark
  const themeToggle = document.getElementById('theme-toggle') as HTMLInputElement;
  const html = document.documentElement;
  const logoLight = document.getElementById('logo-light') as HTMLImageElement;
  const logoDark = document.getElementById('logo-dark') as HTMLImageElement;

  const updateLogo = (isDark: boolean) => {
    if (isDark) {
      logoLight.classList.add('hidden');
      logoDark.classList.remove('hidden');
    } else {
      logoLight.classList.remove('hidden');
      logoDark.classList.add('hidden');
    }
  };

  // Check for saved theme preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'datavine-dark' : 'datavine');

  html.setAttribute('data-theme', initialTheme);
  themeToggle.checked = initialTheme === 'datavine';
  updateLogo(initialTheme === 'datavine-dark');

  themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'datavine' : 'datavine-dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateLogo(newTheme === 'datavine-dark');
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
