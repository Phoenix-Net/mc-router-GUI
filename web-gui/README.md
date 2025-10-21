# MC-Router Web GUI

A modern web interface for managing mc-router configurations. This directory contains the web GUI implementation that integrates with mc-router's REST API.

**Note**: The main documentation for the Web GUI has been moved to the [main README](../README.md#web-gui). Please refer to that for usage instructions and deployment options.

## Local Development

For local development of the web GUI:

### Prerequisites

- Node.js 18+
- TypeScript
- Running mc-router instance with API enabled

### Development Setup

```bash
# Install dependencies
npm install

# Start development server (requires mc-router running with -api-binding)
npm run dev

# Build CSS in watch mode (separate terminal)
npm run build-css
```

### Building for Production

```bash
# Build backend TypeScript
npm run build

# Build frontend TypeScript
npx tsc --project tsconfig.frontend.json

# Build CSS
npm run build-css-prod
```

## Architecture

The web GUI consists of:

1. **Backend (Node.js + Express)**: Proxy server that forwards requests to mc-router's API
2. **Frontend (TypeScript)**: Vanilla TypeScript with Tailwind CSS
3. **Direct Integration**: Connects to mc-router's REST API without requiring a database

## Files

- `src/server.ts` - Express server that proxies to mc-router API
- `public/js/` - Frontend TypeScript/JavaScript files
- `views/index.ejs` - Main web interface template
- `Dockerfile.integrated` - Docker image with both mc-router and web GUI
- `start.sh` - Startup script for integrated container