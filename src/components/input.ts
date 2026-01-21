import { store } from '../state';
import { parseODataMetadata } from '../parser';

export function createInputSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'bg-base-100 rounded-box shadow-sm overflow-hidden';
  
  // Start expanded, collapse after metadata loads
  let isCollapsed = false;
  
  const render = () => {
    section.innerHTML = `
      <div class="flex items-center justify-between p-3 cursor-pointer hover:bg-base-200/50 border-b border-base-200" id="input-header">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="font-medium">Load Metadata</span>
          <span id="metadata-status" class="badge badge-sm ${store.getState().metadata ? 'badge-success' : 'badge-ghost'}">
            ${store.getState().metadata ? `${store.getState().metadata!.allEntities.length} entities loaded` : 'No data'}
          </span>
        </div>
        ${store.getState().metadata ? `
          <button id="clear-metadata" class="btn btn-xs btn-ghost text-error" title="Clear metadata">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ` : ''}
      </div>
      <div id="input-body" class="${isCollapsed ? 'hidden' : ''} p-4">
        <div class="tabs tabs-box mb-4">
          <input type="radio" name="input-tabs" class="tab" aria-label="Paste XML" checked />
          <input type="radio" name="input-tabs" class="tab" aria-label="URL" />
          <input type="radio" name="input-tabs" class="tab" aria-label="Upload File" />
        </div>
        <div id="input-content"></div>
      </div>
    `;

    // Header click to toggle
    section.querySelector('#input-header')?.addEventListener('click', (e) => {
      // Don't toggle if clicking clear button
      if ((e.target as HTMLElement).closest('#clear-metadata')) return;
      isCollapsed = !isCollapsed;
      render();
    });

    // Clear metadata button
    section.querySelector('#clear-metadata')?.addEventListener('click', (e) => {
      e.stopPropagation();
      store.setMetadata(null);
      isCollapsed = false;
      render();
    });

    // Only setup tabs if not collapsed
    if (!isCollapsed) {
      setupTabs();
    }
  };

  // Store XML content separately to avoid textarea performance issues
  let xmlContent = '';

  const setupTabs = () => {
    const tabs = section.querySelectorAll('input[name="input-tabs"]');
    const contentArea = section.querySelector('#input-content')!;

    const renderPasteTab = () => {
      contentArea.innerHTML = `
        <div class="space-y-3">
          <textarea 
            id="xml-input" 
            class="textarea textarea-bordered w-full h-32 font-mono text-sm"
            spellcheck="false"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            placeholder="Paste your OData $metadata XML here..."></textarea>
          <div id="xml-info" class="text-sm text-base-content/60 hidden"></div>
          <div class="flex gap-2 flex-wrap">
            <button id="parse-btn" class="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              Parse Metadata
            </button>
            <button id="clear-btn" class="btn btn-ghost btn-sm hidden">
              Clear
            </button>
            <button id="sample-btn" class="btn btn-ghost btn-sm">
              Load Sample
            </button>
          </div>
        </div>
      `;

      const textarea = contentArea.querySelector('#xml-input') as HTMLTextAreaElement;
      const xmlInfo = contentArea.querySelector('#xml-info') as HTMLElement;
      const parseBtn = contentArea.querySelector('#parse-btn')!;
      const clearBtn = contentArea.querySelector('#clear-btn')!;
      const sampleBtn = contentArea.querySelector('#sample-btn')!;

      if (xmlContent) {
        showXmlInfo(xmlContent, textarea, xmlInfo, clearBtn);
      }

      parseBtn.addEventListener('click', () => {
        const content = textarea.value || xmlContent;
        if (content) {
          xmlContent = content;
          handleParse(content);
        } else {
          store.setError('Please provide XML content');
        }
      });

      clearBtn.addEventListener('click', () => {
        xmlContent = '';
        textarea.value = '';
        textarea.classList.remove('hidden');
        textarea.disabled = false;
        xmlInfo.classList.add('hidden');
        clearBtn.classList.add('hidden');
      });

      sampleBtn.addEventListener('click', () => {
        xmlContent = getSampleMetadata();
        textarea.value = xmlContent;
      });

      textarea.addEventListener('paste', (e) => {
        const pastedText = e.clipboardData?.getData('text');
        if (pastedText && pastedText.length > 50000) {
          e.preventDefault();
          xmlContent = pastedText;
          showXmlInfo(pastedText, textarea, xmlInfo, clearBtn);
        }
      });
    };

    const showXmlInfo = (
      content: string, 
      textarea: HTMLTextAreaElement, 
      xmlInfo: HTMLElement, 
      clearBtn: Element
    ) => {
      const sizeKB = (content.length / 1024).toFixed(1);
      const lines = content.split('\n').length;
      xmlInfo.innerHTML = `
        <div class="alert alert-info py-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Large XML loaded: ${sizeKB} KB, ${lines.toLocaleString()} lines</span>
        </div>
      `;
      textarea.value = '';
      textarea.placeholder = 'Large XML content loaded';
      textarea.disabled = true;
      textarea.classList.add('hidden');
      xmlInfo.classList.remove('hidden');
      clearBtn.classList.remove('hidden');
    };

    const renderUrlTab = () => {
      contentArea.innerHTML = `
        <div class="space-y-3">
          <div class="join w-full">
            <input 
              id="url-input" 
              type="url" 
              class="input input-bordered input-sm join-item flex-1" 
              placeholder="https://services.odata.org/V4/Northwind/Northwind.svc/$metadata" />
            <button id="fetch-btn" class="btn btn-primary btn-sm join-item">
              Fetch
            </button>
          </div>
          <p class="text-xs text-base-content/60">
            CORS must be enabled on the target server
          </p>
        </div>
      `;

      const urlInput = contentArea.querySelector('#url-input') as HTMLInputElement;
      const fetchBtn = contentArea.querySelector('#fetch-btn')!;

      fetchBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) {
          store.setError('Please enter a URL');
          return;
        }

        store.setLoading(true);
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const xml = await response.text();
          handleParse(xml);
        } catch (error) {
          store.setError(`Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    };

    const renderUploadTab = () => {
      contentArea.innerHTML = `
        <div 
          id="drop-zone" 
          class="border-2 border-dashed border-base-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-base-200/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="text-sm font-medium">Drop XML file here or click to browse</p>
          <input type="file" id="file-input" accept=".xml,.edmx" class="hidden" />
        </div>
      `;

      const dropZone = contentArea.querySelector('#drop-zone') as HTMLElement;
      const fileInput = contentArea.querySelector('#file-input') as HTMLInputElement;

      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-base-200');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-base-200');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-base-200');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          readFile(files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          readFile(fileInput.files[0]);
        }
      });
    };

    const readFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleParse(content);
      };
      reader.onerror = () => {
        store.setError('Failed to read file');
      };
      reader.readAsText(file);
    };

    // Tab switching
    tabs.forEach((tab, index) => {
      tab.addEventListener('change', () => {
        if (index === 0) renderPasteTab();
        else if (index === 1) renderUrlTab();
        else renderUploadTab();
      });
    });

    // Initial tab render
    renderPasteTab();
  };

  const handleParse = (xml: string) => {
    if (!xml.trim()) {
      store.setError('Please provide XML content');
      return;
    }

    store.setLoading(true);
    store.setError(null);

    setTimeout(() => {
      try {
        const metadata = parseODataMetadata(xml);
        store.setMetadata(metadata);
        store.setLoading(false);
        
        // Auto-collapse after successful load
        isCollapsed = true;
        render();
      } catch (error) {
        store.setError(error instanceof Error ? error.message : 'Failed to parse metadata');
      }
    }, 10);
  };

  // Initial render
  render();

  return section;
}

function getSampleMetadata(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="NorthwindModel" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Customer">
        <Key>
          <PropertyRef Name="CustomerID"/>
        </Key>
        <Property Name="CustomerID" Type="Edm.String" Nullable="false" MaxLength="5"/>
        <Property Name="CompanyName" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="ContactName" Type="Edm.String" MaxLength="30"/>
        <Property Name="City" Type="Edm.String" MaxLength="15"/>
        <Property Name="Country" Type="Edm.String" MaxLength="15"/>
        <NavigationProperty Name="Orders" Type="Collection(NorthwindModel.Order)" Partner="Customer"/>
      </EntityType>
      <EntityType Name="Order">
        <Key>
          <PropertyRef Name="OrderID"/>
        </Key>
        <Property Name="OrderID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CustomerID" Type="Edm.String" MaxLength="5"/>
        <Property Name="OrderDate" Type="Edm.DateTimeOffset"/>
        <Property Name="Freight" Type="Edm.Decimal" Precision="19" Scale="4"/>
        <NavigationProperty Name="Customer" Type="NorthwindModel.Customer" Partner="Orders"/>
        <NavigationProperty Name="Employee" Type="NorthwindModel.Employee" Partner="Orders"/>
        <NavigationProperty Name="Order_Details" Type="Collection(NorthwindModel.Order_Detail)" Partner="Order"/>
      </EntityType>
      <EntityType Name="Employee">
        <Key>
          <PropertyRef Name="EmployeeID"/>
        </Key>
        <Property Name="EmployeeID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="LastName" Type="Edm.String" Nullable="false" MaxLength="20"/>
        <Property Name="FirstName" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="Title" Type="Edm.String" MaxLength="30"/>
        <NavigationProperty Name="Orders" Type="Collection(NorthwindModel.Order)" Partner="Employee"/>
      </EntityType>
      <EntityType Name="Product">
        <Key>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="ProductID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ProductName" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="UnitPrice" Type="Edm.Decimal" Precision="19" Scale="4"/>
        <Property Name="Discontinued" Type="Edm.Boolean" Nullable="false"/>
        <NavigationProperty Name="Category" Type="NorthwindModel.Category" Partner="Products"/>
        <NavigationProperty Name="Order_Details" Type="Collection(NorthwindModel.Order_Detail)" Partner="Product"/>
      </EntityType>
      <EntityType Name="Category">
        <Key>
          <PropertyRef Name="CategoryID"/>
        </Key>
        <Property Name="CategoryID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="CategoryName" Type="Edm.String" Nullable="false" MaxLength="15"/>
        <Property Name="Description" Type="Edm.String"/>
        <NavigationProperty Name="Products" Type="Collection(NorthwindModel.Product)" Partner="Category"/>
      </EntityType>
      <EntityType Name="Order_Detail">
        <Key>
          <PropertyRef Name="OrderID"/>
          <PropertyRef Name="ProductID"/>
        </Key>
        <Property Name="OrderID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ProductID" Type="Edm.Int32" Nullable="false"/>
        <Property Name="UnitPrice" Type="Edm.Decimal" Nullable="false" Precision="19" Scale="4"/>
        <Property Name="Quantity" Type="Edm.Int16" Nullable="false"/>
        <NavigationProperty Name="Order" Type="NorthwindModel.Order" Partner="Order_Details"/>
        <NavigationProperty Name="Product" Type="NorthwindModel.Product" Partner="Order_Details"/>
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;
}
