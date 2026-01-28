<div align="center">
    <h1><b>AltWiki</b></h1>
    <p>
        Open-source collaborative wiki and documentation software.
    </p>
</div>
<br />

## Getting started

See the Local Development Setup section below to get started with AltWiki.

## Local Development Setup

1. Copy `.env.example` to `.env` and configure your settings.

2. **Database Setup** - Choose one option:

   **Option A: Use Docker PostgreSQL**
   ```bash
   # Stop local PostgreSQL if running
   sudo systemctl stop postgresql
   
   # Start containers (resets data)
   docker compose down -v && docker compose up -d
   ```

   **Option B: Use local PostgreSQL**
   ```bash
   sudo -u postgres psql -c "CREATE USER docmost WITH PASSWORD 'atpass';"
   sudo -u postgres psql -c "CREATE DATABASE docmost OWNER docmost;"
   ```

3. Run migrations:
   ```bash
   pnpm nx run server:migration:latest
   ```

4. Start the development server:
   ```bash
   pnpm nx run server:dev
   ```

## Features

- Real-time collaboration
- Diagrams (Draw.io, Excalidraw and Mermaid)
- Spaces
- Permissions management
- Groups
- Comments
- Page history
- Search
- File attachments
- Embeds (Airtable, Loom, Miro and more)
- Translations (10+ languages)

### Screenshots

<p align="center">
<img alt="home" src="https://docmost.com/screenshots/home.png" width="70%">
<img alt="editor" src="https://docmost.com/screenshots/editor.png" width="70%">
</p>

### License
AltWiki core is licensed under the open-source AGPL 3.0 license.  
Enterprise features are available under an enterprise license (Enterprise Edition).  

All files in the following directories are licensed under the AltWiki Enterprise license defined in `packages/ee/License`.
  - apps/server/src/ee
  - apps/client/src/ee
  - packages/ee

