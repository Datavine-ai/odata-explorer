# OData Metadata Viewer

An interactive web application for visualizing and exploring OData v4 metadata (EDMX) documents. Built by [Datavine](https://datavine.com).

## Features

- **Multiple Input Methods** - Paste XML directly, fetch from URL, upload files, or load sample data
- **Entity Explorer** - Browse entity types, complex types, and enums organized by namespace
- **Full-Text Search** - Search across entity names, property names, types, and navigation properties
- **Interactive Relationship Diagram** - D3.js-powered visualization of entity relationships with expand/collapse navigation
- **Nested Type Navigation** - Drill into ComplexType collections with breadcrumb navigation
- **Light/Dark Theme** - Toggle between themes with system preference detection

## Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **D3.js** - Interactive graph visualization
- **TailwindCSS** + **DaisyUI** - Styling and components

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/datavine/odata-metadata-viewer.git
cd odata-metadata-viewer

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Opens the development server at `http://localhost:5173` with hot module replacement.

### Production Build

```bash
npm run build
```

Outputs optimized production files to the `dist/` directory.

### Preview Build

```bash
npm run preview
```

Serves the production build locally for testing.

## Usage

1. **Load Metadata** - Choose one of the input methods:
   - Paste OData XML/EDMX content directly
   - Enter a URL to fetch metadata (requires CORS support)
   - Drag and drop or browse for a local `.xml` or `.edmx` file
   - Click "Load Sample" to explore with example data

2. **Explore Entities** - Use the sidebar to browse entities grouped by namespace. The search bar filters by:
   - Entity name
   - Property names
   - Property types
   - Navigation property targets

3. **View Details** - Click an entity to see:
   - Properties with type badges and nullability
   - Key properties (highlighted)
   - Navigation properties with relationship type
   - Inheritance information

4. **Visualize Relationships** - The diagram panel shows an interactive graph:
   - Click nodes to expand/collapse relationships
   - Use zoom controls to navigate
   - Different colors indicate entity types vs complex types

## Project Structure

```
src/
├── main.ts              # Application entry point
├── parser.ts            # OData XML metadata parser
├── state.ts             # Global state management
├── types.ts             # TypeScript type definitions
├── style.css            # TailwindCSS styles
├── lib/
│   ├── helpers.ts       # Utility functions
│   └── relationships.ts # Relationship extraction helpers
└── components/
    ├── input.ts         # XML input component
    ├── sidebar.ts       # Entity list with search
    ├── diagram.ts       # D3 relationship graph
    ├── split-pane.ts    # Resizable split pane
    └── detail/
        ├── index.ts     # Entity detail view
        └── properties.ts # Property rendering
```

## Configuration

### Theme Customization

The application uses custom DaisyUI themes defined in `tailwind.config.js`. Modify the `datavine` and `datavine-dark` theme objects to customize colors.

### Split Pane

Adjust the split pane behavior in `src/components/split-pane.ts`:
- `initialLeftWidth` - Starting width (default: 55%)
- `minLeftWidth` - Minimum width (default: 30%)
- `maxLeftWidth` - Maximum width (default: 70%)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

Built with care by the team at [Datavine](https://datavine.com).
