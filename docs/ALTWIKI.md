# AltWiki

AltWiki is a fork of [Docmost](https://github.com/docmost/docmost), an open-source documentation and wiki platform. This fork adds several features that we needed for internal use.

## What is Docmost?

Docmost is a self-hosted collaborative documentation platform similar to Confluence or Notion. It provides:

- Real-time collaborative editing
- Spaces for organizing documentation
- Page hierarchy with nested pages
- Rich text editor with markdown support
- Comments and discussions
- User and permission management
- Full-text search

## What AltWiki Adds

This fork extends Docmost with the following features:

### Templates

Pre-built page templates for common documentation types. Instead of starting from a blank page, users can select from templates like:

- Visual Effect documentation
- Image Processor specs
- 3D Visualization guides

Templates are accessible from the sidebar via "New from Template".

### GitHub Repository to Documentation

Generate documentation automatically from a GitHub repository. This feature:

1. Fetches repository structure and files
2. Analyzes the codebase
3. Uses AI (Gemini) to generate documentation
4. Creates pages in the wiki automatically

Accessible from the sidebar via "Generate from GitHub". Useful for onboarding new developers or maintaining up-to-date project documentation.

### Confluence Import

Import existing documentation from Confluence as a new space. This feature:

- Parses Confluence Space Export ZIP files (entities.xml format)
- Preserves page hierarchy and parent-child relationships
- Converts Confluence Storage Format to standard HTML
- Imports attachments (images, files)
- Resolves internal page links and attachment references

Access via "Import Confluence" button on the Spaces page (admin only).

### Page Sorting

Sort pages in the sidebar by various criteria:

- Alphabetical (A to Z, Z to A)
- Date created (newest/oldest first)
- Date modified (newest/oldest first)

Access via the space menu (three dots icon) in the sidebar under "Sort pages".

### Bulk Page Operations

Select multiple pages in the sidebar tree and perform bulk actions:

- Move multiple pages to a different location
- Delete multiple pages at once

Hold Ctrl/Cmd to select multiple pages, then use the bulk actions bar.

### Navigation Improvements

- Added "Spaces" link in the header navbar for quick access to all spaces

## Installation

AltWiki uses Docker for deployment.

### Prerequisites

- Docker and Docker Compose
- PostgreSQL (included in docker-compose)
- Redis (included in docker-compose)

### Quick Start

```bash
git clone https://github.com/StarAtNyte/AltWiki.git
cd AltWiki
cp .env.example .env
# Edit .env with your settings
docker compose up -d
```

The application will be available at `http://localhost:3000` (or the port you configured).

### Environment Variables

Key environment variables:

| Variable | Description |
|----------|-------------|
| APP_URL | Public URL of the application |
| APP_SECRET | Secret key for sessions (generate a random string) |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| GEMINI_API_KEY | Google Gemini API key (for GitHub docs generation) |

## Development

### Local Setup

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Project Structure

```
apps/
  client/          # React frontend
  server/          # NestJS backend
packages/
  editor-ext/      # Editor extensions
docs/              # Documentation
```

### Building

```bash
pnpm build
```

### Docker Build

```bash
docker compose build
docker compose up
```

## Differences from Upstream

This fork tracks the main Docmost repository but includes additional features. Key changes:

1. **Template system** - `apps/client/src/features/templates/`
2. **GitHub docs integration** - `apps/server/src/integrations/github-docs/`
3. **Confluence import** - `apps/server/src/integrations/import/services/confluence-import.service.ts`
4. **Page sorting** - `apps/client/src/features/page/tree/atoms/tree-data-atom.ts`
5. **Bulk page operations** - `apps/client/src/features/page/tree/components/bulk-actions-bar.tsx`
6. **Header navigation** - `apps/client/src/components/layouts/global/app-header.tsx`

## Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

## License

This project inherits the license from the original Docmost project. See [LICENSE](../LICENSE) for details.

## Links

- Original project: https://github.com/docmost/docmost
- This fork: https://github.com/StarAtNyte/AltWiki
