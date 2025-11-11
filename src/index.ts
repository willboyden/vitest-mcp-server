import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import pino from 'pino';
import fs from 'fs-extra';
import path from 'path';
import { loadPlugins } from './plugins/loader.js';

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Load configuration
let config = {
  projectRoot: process.cwd(),
  port: parseInt(process.env.PORT || '3000'),
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  coverageThresholds: {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100
  }
};

// Try to load config from file
try {
  const configPath = path.join(process.cwd(), 'mcp.config.json');
  if (await fs.pathExists(configPath)) {
    const fileConfig = await fs.readJSON(configPath);
    config = { ...config, ...fileConfig };
    logger.info('Loaded configuration from mcp.config.json');
  }
} catch (error) {
  logger.warn('Failed to load mcp.config.json, using defaults');
}

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration
    }, 'Request completed');
  });
  
  next();
});

// Error handling middleware
app.use((error: any, _req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: error.message,
    stack: error.stack
  }, 'Unhandled error');
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint with detailed status
app.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    config: {
      projectRoot: config.projectRoot,
      port: config.port,
      logLevel: config.logLevel
    },
    features: {
      aiTests: !!process.env.OPENAI_API_KEY,
      pluginsLoaded: true
    }
  };
  
  res.json(health);
});

// Basic API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'Vitest Coverage MCP Server',
    version: '2.0.0',
    description: 'Advanced MCP server for Vitest coverage analysis and test generation',
    endpoints: [
      '/health - Server health check',
      '/api - This endpoint',
      'Plugin endpoints loaded dynamically from src/tools/'
    ],
    documentation: 'See README.md for full API documentation'
  });
});

// Load all plugins dynamically
async function initializeServer() {
  try {
    logger.info('Loading plugins...');
    await loadPlugins(app);
    
    // Add static file serving for coverage reports
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (await fs.pathExists(coverageDir)) {
      app.use('/coverage', express.static(coverageDir, {
        index: 'index.html',
        setHeaders: (res) => {
          res.set('Cache-Control', 'public, max-age=3600');
        }
      }));
      logger.info('Coverage reports available at /coverage');
    }
    
    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      logger.info(`MCP Vitest Coverage server v2.0.0 listening on http://localhost:${PORT}`);
      logger.info(`Project root: ${config.projectRoot}`);
      logger.info(`Log level: ${config.logLevel}`);
      
      if (process.env.OPENAI_API_KEY) {
        logger.info('OpenAI API key detected - AI features enabled');
      } else {
        logger.warn('No OpenAI API key found - AI features disabled');
      }
    });
    
  } catch (error) {
    logger.error({ error }, 'Failed to initialize server');
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start the server
initializeServer();
