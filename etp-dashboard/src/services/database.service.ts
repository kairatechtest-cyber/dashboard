import { Injectable, signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { inject } from '@angular/core';

export type DatabaseType = 'local' | 'aws';
export type ConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected';

export interface DatabaseSettings {
  id: string;
  name: string;
  dbType: DatabaseType;
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private readonly storageKey = 'etp_dashboard_db_settings';
  private notificationService = inject(NotificationService);

  connections = signal<DatabaseSettings[]>(this.loadConnections());
  status = signal<ConnectionStatus>('unknown');

  private loadConnections(): DatabaseSettings[] {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // New format: an array of connections
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Restore default AWS password if it was cleared from storage
          return parsed.map(conn => {
            if (conn.dbType === 'aws' && (!conn.password || conn.password === '')) {
              return { ...conn, password: 'AB5wkYaStktPuzzYLEwX' };
            }
            return conn;
          });
        }
        // Old format: a single object. Migrate it.
        else if (typeof parsed === 'object' && parsed !== null && 'dbType' in parsed && !Array.isArray(parsed)) {
            const migratedConnection: DatabaseSettings = {
                id: `migrated-${new Date().getTime()}`,
                name: parsed.dbType === 'aws' ? 'Default AWS Connection' : 'Migrated Local Connection',
                dbType: parsed.dbType,
                host: parsed.host,
                port: parsed.port,
                user: parsed.user,
                password: parsed.password,
                database: parsed.database
            };

            if (migratedConnection.dbType === 'aws' && (!migratedConnection.password || migratedConnection.password === '')) {
                migratedConnection.password = 'AB5wkYaStktPuzzYLEwX';
            }
            this.saveConnections([migratedConnection]);
            return [migratedConnection];
        }
      } catch (e) {
        console.error('Error parsing DB settings from localStorage', e);
      }
    }
    // Default to AWS if nothing is stored or storage is corrupted/empty array
    const defaultConnection: DatabaseSettings = {
      id: `default-${new Date().getTime()}`,
      name: 'Default AWS Connection',
      dbType: 'aws',
      host: 'wipro-db.cdkuy8m2s6zd.ap-south-1.rds.amazonaws.com',
      port: 5432,
      user: 'postgres',
      password: 'AB5wkYaStktPuzzYLEwX',
      database: 'wipro-db',
    };
    this.saveConnections([defaultConnection]);
    return [defaultConnection];
  }

  private saveConnections(connections: DatabaseSettings[]): void {
    const connectionsToSave = connections.map(conn => {
      const connCopy = { ...conn };
      // Don't save the actual password for AWS for security demo, but do for local for convenience.
      if (connCopy.dbType === 'aws') {
          connCopy.password = ''; 
      }
      return connCopy;
    });
    localStorage.setItem(this.storageKey, JSON.stringify(connectionsToSave));
  }
  
  addConnection(settings: Omit<DatabaseSettings, 'id'>): void {
    const newConnection: DatabaseSettings = {
      ...settings,
      id: `conn-${new Date().getTime()}`
    };
    this.connections.update(conns => [...conns, newConnection]);
    this.saveConnections(this.connections());
  }

  updateConnection(settings: DatabaseSettings): void {
    this.connections.update(conns => conns.map(c => c.id === settings.id ? settings : c));
    this.saveConnections(this.connections());
  }

  deleteConnection(id: string): void {
    this.connections.update(conns => conns.filter(c => c.id !== id));
    this.saveConnections(this.connections());
  }

  testConnection(settings: Partial<DatabaseSettings>): Promise<ConnectionTestResult> {
    this.status.set('connecting');
    console.log('Testing connection with:', { ...settings, password: '***' });

    return new Promise((resolve) => {
      setTimeout(() => {
        const host = settings.host?.trim().toLowerCase();
        const port = Number(settings.port);
        const user = settings.user?.trim();
        const password = settings.password?.trim();
        const database = settings.database?.trim();

        let expected: Omit<DatabaseSettings, 'id' | 'name'>;

        if (settings.dbType === 'aws') {
          expected = {
            dbType: 'aws',
            host: 'wipro-db.cdkuy8m2s6zd.ap-south-1.rds.amazonaws.com'.toLowerCase(),
            port: 5432,
            user: 'postgres',
            password: 'AB5wkYaStktPuzzYLEwX',
            database: 'wipro-db',
          };
        } else { // 'local'
          expected = {
            dbType: 'local',
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'admin',
            database: 'etp_dashboard',
          };
        }

        let errorMessage: string | null = null;
        if (host !== expected.host) {
          errorMessage = `Invalid Host. The endpoint for this mock connection is incorrect.`;
        } else if (port !== expected.port) {
          errorMessage = `Invalid Port. Please use port ${expected.port} for this mock connection.`;
        } else if (user !== expected.user) {
          errorMessage = `Invalid User. The correct username is '${expected.user}'.`;
        } else if (password !== expected.password) {
          errorMessage = `Authentication Failed. The password does not match the mock credentials.`;
        } else if (database !== expected.database) {
          errorMessage = `Database Not Found. The correct database name is '${expected.database}'.`;
        }

        if (errorMessage) {
          this.status.set('disconnected');
          this.notificationService.addNotification(errorMessage, 'error');
          resolve({ success: false, message: errorMessage });
        } else {
          const successMessage = 'Database connection successful!';
          this.status.set('connected');
          this.notificationService.addNotification(successMessage, 'success');
          resolve({ success: true, message: successMessage });
        }
      }, 1500);
    });
  }
}