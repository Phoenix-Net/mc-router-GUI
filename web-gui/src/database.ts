import sqlite3 from 'sqlite3';
import path from 'path';
import { ServerMapping, ConfigSetting, RouterConfig } from './types';

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../mc-router.db'));
    this.init();
  }

  private init(): void {
    // Create tables if they don't exist
    this.db.serialize(() => {
      // Server mappings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS server_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hostname TEXT UNIQUE NOT NULL,
          backend TEXT NOT NULL,
          is_default BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Configuration settings table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS config_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insert default configuration values
      const defaultConfigs: [string, string, string][] = [
        ['port', '25565', 'Port to listen for Minecraft connections'],
        ['api_binding', ':8080', 'API binding address'],
        ['debug', 'false', 'Enable debug logging'],
        ['connection_rate_limit', '1', 'Max connections per second'],
        ['in_docker', 'true', 'Enable Docker service discovery']
      ];

      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO config_settings (key, value, description) 
        VALUES (?, ?, ?)
      `);

      defaultConfigs.forEach(config => {
        stmt.run(config);
      });
      stmt.finalize();
    });
  }

  // Server mappings methods
  getAllMappings(callback: (err: Error | null, mappings?: ServerMapping[]) => void): void {
    this.db.all('SELECT * FROM server_mappings ORDER BY hostname', callback);
  }

  addMapping(
    hostname: string, 
    backend: string, 
    isDefault: boolean = false, 
    callback: (err: Error | null) => void
  ): void {
    // If this is set as default, unset all other defaults
    if (isDefault) {
      this.db.run('UPDATE server_mappings SET is_default = 0');
    }

    this.db.run(
      'INSERT INTO server_mappings (hostname, backend, is_default) VALUES (?, ?, ?)',
      [hostname, backend, isDefault ? 1 : 0],
      callback
    );
  }

  updateMapping(
    id: number, 
    hostname: string, 
    backend: string, 
    isDefault: boolean = false, 
    callback: (err: Error | null) => void
  ): void {
    // If this is set as default, unset all other defaults
    if (isDefault) {
      this.db.run('UPDATE server_mappings SET is_default = 0 WHERE id != ?', [id]);
    }

    this.db.run(
      'UPDATE server_mappings SET hostname = ?, backend = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hostname, backend, isDefault ? 1 : 0, id],
      callback
    );
  }

  deleteMapping(id: number, callback: (err: Error | null) => void): void {
    this.db.run('DELETE FROM server_mappings WHERE id = ?', [id], callback);
  }

  // Configuration methods
  getAllConfig(callback: (err: Error | null, configs?: ConfigSetting[]) => void): void {
    this.db.all('SELECT * FROM config_settings ORDER BY key', callback);
  }

  getConfig(key: string, callback: (err: Error | null, config?: { value: string }) => void): void {
    this.db.get('SELECT value FROM config_settings WHERE key = ?', [key], callback);
  }

  setConfig(key: string, value: string, callback: (err: Error | null) => void): void {
    this.db.run(
      'UPDATE config_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [value, key],
      callback
    );
  }

  // Generate mc-router configuration
  generateRouterConfig(callback: (err: Error | null, config?: RouterConfig) => void): void {
    this.getAllMappings((err, mappings) => {
      if (err) return callback(err);

      this.getAllConfig((err, configs) => {
        if (err) return callback(err);

        const configMap: Record<string, string> = {};
        configs?.forEach(config => {
          configMap[config.key] = config.value;
        });

        const routerConfig: RouterConfig = {
          port: configMap.port || '25565',
          apiBinding: configMap.api_binding || ':8080',
          debug: configMap.debug === 'true',
          connectionRateLimit: parseInt(configMap.connection_rate_limit) || 1,
          inDocker: configMap.in_docker === 'true',
          mappings: {},
          defaultServer: null
        };

        mappings?.forEach(mapping => {
          if (mapping.is_default) {
            routerConfig.defaultServer = mapping.backend;
          } else {
            routerConfig.mappings[mapping.hostname] = mapping.backend;
          }
        });

        callback(null, routerConfig);
      });
    });
  }

  close(): void {
    this.db.close();
  }
}