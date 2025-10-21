import { Database } from './database';
import { RouterConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigBridge {
  private db: Database;
  private configPath: string;

  constructor(configPath: string = '/tmp/mc-router-config.json') {
    this.db = new Database();
    this.configPath = configPath;
  }

  async generateConfigFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.generateRouterConfig((err, config) => {
        if (err) {
          reject(err);
          return;
        }

        if (!config) {
          reject(new Error('No configuration generated'));
          return;
        }

        // Convert to mc-router JSON format
        const routerConfigFile = {
          'default-server': config.defaultServer,
          mappings: config.mappings
        };

        try {
          fs.writeFileSync(this.configPath, JSON.stringify(routerConfigFile, null, 2));
          console.log(`Configuration written to ${this.configPath}`);
          resolve();
        } catch (writeErr) {
          reject(writeErr);
        }
      });
    });
  }

  async getEnvironmentVariables(): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      this.db.generateRouterConfig((err, config) => {
        if (err) {
          reject(err);
          return;
        }

        if (!config) {
          reject(new Error('No configuration generated'));
          return;
        }

        const envVars: Record<string, string> = {
          PORT: config.port,
          API_BINDING: config.apiBinding,
          DEBUG: config.debug.toString(),
          CONNECTION_RATE_LIMIT: config.connectionRateLimit.toString(),
          IN_DOCKER: config.inDocker.toString(),
          ROUTES_CONFIG: this.configPath
        };

        // Add default server if set
        if (config.defaultServer) {
          envVars.DEFAULT = config.defaultServer;
        }

        // Convert mappings to MAPPING format
        const mappingEntries = Object.entries(config.mappings);
        if (mappingEntries.length > 0) {
          envVars.MAPPING = mappingEntries
            .map(([hostname, backend]) => `${hostname}=${backend}`)
            .join('\n');
        }

        resolve(envVars);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}

// CLI usage
if (require.main === module) {
  const bridge = new ConfigBridge();
  
  const command = process.argv[2];
  
  if (command === 'generate-config') {
    bridge.generateConfigFile()
      .then(() => {
        console.log('Configuration file generated successfully');
        bridge.close();
        process.exit(0);
      })
      .catch(err => {
        console.error('Failed to generate configuration:', err);
        bridge.close();
        process.exit(1);
      });
  } else if (command === 'get-env') {
    bridge.getEnvironmentVariables()
      .then(envVars => {
        // Output as shell export statements
        Object.entries(envVars).forEach(([key, value]) => {
          console.log(`export ${key}="${value}"`);
        });
        bridge.close();
        process.exit(0);
      })
      .catch(err => {
        console.error('Failed to get environment variables:', err);
        bridge.close();
        process.exit(1);
      });
  } else {
    console.log('Usage: node config-bridge.js [generate-config|get-env]');
    bridge.close();
    process.exit(1);
  }
}