import { Injectable, signal } from '@angular/core';

export interface ActivityLog {
  user: string; // email of the user
  action: string;
  timestamp: string; // ISO string
}

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private readonly storageKey = 'etp_dashboard_activity_log';
  logs = signal<ActivityLog[]>([]);

  constructor() {
    this.loadLogsFromStorage();
  }

  private loadLogsFromStorage() {
    const storedLogs = localStorage.getItem(this.storageKey);
    if (storedLogs) {
      try {
        this.logs.set(JSON.parse(storedLogs));
      } catch (e) {
        console.error('Error parsing activity logs from localStorage', e);
        this.logs.set([]);
      }
    }
  }

  private saveLogsToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.logs()));
  }

  logActivity(userEmail: string, action: string): void {
    if (!userEmail) {
      console.warn('ActivityLogService: Cannot log activity without a user email.');
      return;
    }
    const newLog: ActivityLog = {
      user: userEmail,
      action,
      timestamp: new Date().toISOString(),
    };
    this.logs.update(currentLogs => [newLog, ...currentLogs].slice(0, 100)); // Keep last 100 logs
    this.saveLogsToStorage();
  }

  clearLogs(): void {
    this.logs.set([]);
    localStorage.removeItem(this.storageKey);
  }
}
