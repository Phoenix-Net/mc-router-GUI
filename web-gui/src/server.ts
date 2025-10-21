import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.GUI_PORT || 3000;
const MC_ROUTER_API = process.env.MC_ROUTER_API || 'http://localhost:8080';

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

// Routes
app.get('/', async (req: Request, res: Response) => {
  try {
    // Fetch mappings from mc-router API
    const response = await fetchFromMCRouter('/routes');
    let mappings: Array<{ hostname: string, backend: string, is_default: boolean }> = [];

    if (response.ok) {
      const routesData = await response.json() as { [key: string]: string };
      // Convert mc-router format to our display format
      mappings = Object.entries(routesData).map(([hostname, backend]) => ({
        hostname,
        backend,
        is_default: false // We'll handle default separately
      }));
    }

    res.render('index', { mappings });
  } catch (error) {
    console.error('Error loading data:', error);
    res.render('index', { mappings: [] });
  }
});

// Proxy routes to mc-router API
app.get('/routes', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter('/routes');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

app.post('/routes', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter('/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (response.ok) {
      res.status(201).json({ message: 'Route created successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to create route' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.delete('/routes/:serverAddress', async (req: Request, res: Response) => {
  try {
    const response = await fetchFromMCRouter(`/routes/${encodeURIComponent(req.params.serverAddress)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      res.json({ message: 'Route deleted successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to delete route' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete route' });
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
      res.json({ message: 'Default route set successfully' });
    } else {
      res.status(response.status).json({ error: 'Failed to set default route' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to set default route' });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`MC-Router GUI running on port ${PORT}`);
  console.log(`Connecting to MC-Router API at: ${MC_ROUTER_API}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});