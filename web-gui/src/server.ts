import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';

const app = express();
const PORT = process.env.GUI_PORT || 3000;
const MC_ROUTER_API = process.env.MC_ROUTER_API || 'http://localhost:8080';
const ROUTES_CONFIG_FILE = process.env.ROUTES_CONFIG_FILE || path.join(__dirname, '../../routes.json');

// Routes config schema matching mc-router's expected format
interface RoutesConfig {
  'default-server': string;
  mappings: { [hostname: string]: string };
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Helper function to fetch from mc-router API
async function fetchFromMCRouter(endpoint: string, options?: RequestInit) {
  try {
    const response = await fetch(`${MC_ROUTER_API}${endpoint}`, options);
    return response;
  } catch (error) {
    console.error('Error connecting to mc-router:', error);
    throw error;
  }
}

// Config file management functions
async function readRoutesConfig(): Promise<RoutesConfig> {
  try {
    const content = await fs.readFile(ROUTES_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log('Routes config file not found or invalid, creating default...');
    const defaultConfig: RoutesConfig = {
      'default-server': '',
      mappings: {}
    };
    await writeRoutesConfig(defaultConfig);
    return defaultConfig;
  }
}

async function writeRoutesConfig(config: RoutesConfig): Promise<void> {
  try {
    await fs.writeFile(ROUTES_CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log('Routes config saved to:', ROUTES_CONFIG_FILE);
  } catch (error) {
    console.error('Failed to write routes config:', error);
    throw error;
  }
}

async function syncConfigWithMCRouter(): Promise<void> {
  try {
    // Get current routes from mc-router
    const response = await fetchFromMCRouter('/routes');
    if (response.ok) {
      const routes = await response.json() as { [key: string]: string };
      
      // Read current config
      const config = await readRoutesConfig();
      
      // Update mappings in config
      config.mappings = routes;
      
      // Save updated config
      await writeRoutesConfig(config);
    }
  } catch (error) {
    console.error('Failed to sync config with mc-router:', error);
  }
}

// Routes
app.get('/', async (req: Request, res: Response) => {
  try {
    // Try to fetch mappings from mc-router API first
    const response = await fetchFromMCRouter('/routes');
    let mappings: Array<{ hostname: string, backend: string, is_default: boolean }> = [];
    let routerStatus = 'offline';

    if (response.ok) {
      const routesData = await response.json() as { [key: string]: string };
      // Convert mc-router format to our display format
      mappings = Object.entries(routesData).map(([hostname, backend]) => ({
        hostname,
        backend,
        is_default: false // We'll handle default separately
      }));
      routerStatus = 'active';
      
      // Sync with config file when router is active
      await syncConfigWithMCRouter();
    } else {
      // If mc-router is offline, load from config file
      const config = await readRoutesConfig();
      mappings = Object.entries(config.mappings).map(([hostname, backend]) => ({
        hostname,
        backend,
        is_default: backend === config['default-server']
      }));
    }

    res.render('index', { mappings, routerStatus });
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to config file even on error
    try {
      const config = await readRoutesConfig();
      const mappings = Object.entries(config.mappings).map(([hostname, backend]) => ({
        hostname,
        backend,
        is_default: backend === config['default-server']
      }));
      res.render('index', { mappings, routerStatus: 'offline' });
    } catch (configError) {
      res.render('index', { mappings: [], routerStatus: 'offline' });
    }
  }
});

// Proxy routes to mc-router API
app.get('/routes', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter('/routes');
    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      // Fallback to config file if mc-router is offline
      const config = await readRoutesConfig();
      res.json(config.mappings);
    }
  } catch (error) {
    // Fallback to config file on error
    try {
      const config = await readRoutesConfig();
      res.json(config.mappings);
    } catch (configError) {
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }
});

app.post('/routes', async (req: Request, res: Response) => {
  try {
    // Try to add route to mc-router first
    const response = await fetchFromMCRouter('/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (response.ok) {
      // Also save to config file for persistence
      await syncConfigWithMCRouter();
      res.status(201).json({ message: 'Route created successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to create route' });
    }
  } catch (error) {
    // If mc-router is offline, save directly to config file
    try {
      const config = await readRoutesConfig();
      const { serverAddress, backend } = req.body;
      
      if (!serverAddress || !backend) {
        return res.status(400).json({ error: 'serverAddress and backend are required' });
      }
      
      config.mappings[serverAddress] = backend;
      await writeRoutesConfig(config);
      
      res.status(201).json({ 
        message: 'Route saved to config file (mc-router offline)',
        note: 'Route will be loaded when mc-router starts with --routes-config flag'
      });
    } catch (configError) {
      res.status(500).json({ error: 'Failed to create route' });
    }
  }
});

app.delete('/routes/:serverAddress', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter(`/routes/${encodeURIComponent(req.params.serverAddress)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Also save to config file for persistence
      await syncConfigWithMCRouter();
      res.json({ message: 'Route deleted successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to delete route' });
    }
  } catch (error) {
    // If mc-router is offline, delete from config file
    try {
      const config = await readRoutesConfig();
      const serverAddress = req.params.serverAddress;
      
      if (config.mappings[serverAddress]) {
        delete config.mappings[serverAddress];
        await writeRoutesConfig(config);
        res.json({ 
          message: 'Route deleted from config file (mc-router offline)',
          note: 'Changes will be applied when mc-router starts with --routes-config flag'
        });
      } else {
        res.status(404).json({ error: 'Route not found' });
      }
    } catch (configError) {
      res.status(500).json({ error: 'Failed to delete route' });
    }
  }
});

app.post('/defaultRoute', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter('/defaultRoute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (response.ok) {
      // Also save to config file for persistence
      const config = await readRoutesConfig();
      config['default-server'] = req.body.backend || '';
      await writeRoutesConfig(config);
      res.json({ message: 'Default route set successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to set default route' });
    }
  } catch (error) {
    // If mc-router is offline, save to config file
    try {
      const config = await readRoutesConfig();
      config['default-server'] = req.body.backend || '';
      await writeRoutesConfig(config);
      res.json({ 
        message: 'Default route saved to config file (mc-router offline)',
        note: 'Route will be loaded when mc-router starts with --routes-config flag'
      });
    } catch (configError) {
      res.status(500).json({ error: 'Failed to set default route' });
    }
  }
});

// Router status check
app.get('/status', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter('/routes');
    if (response.ok) {
      res.json({ status: 'active', timestamp: new Date().toISOString() });
    } else {
      res.json({ status: 'offline', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.json({ status: 'offline', timestamp: new Date().toISOString() });
  }
});

// Config info endpoint
app.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await readRoutesConfig();
    res.json({
      configFile: ROUTES_CONFIG_FILE,
      config: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read config file' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize config file on startup
async function initializeConfig() {
  try {
    await readRoutesConfig();
    console.log(`Routes config file: ${ROUTES_CONFIG_FILE}`);
  } catch (error) {
    console.error('Failed to initialize config file:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`MC-Router GUI running on port ${PORT}`);
  console.log(`Connecting to MC-Router API at: ${MC_ROUTER_API}`);
  await initializeConfig();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});