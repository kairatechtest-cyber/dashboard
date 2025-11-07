import { Injectable, signal, inject } from '@angular/core';
import { SettingsService } from './settings.service';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private settingsService = inject(SettingsService);
  notifications = signal<Notification[]>([]);
  private nextId = 0;

  addNotification(message: string, type: 'success' | 'warning' | 'error'): void {
    const settings = this.settingsService.settings().notifications;

    // Check settings before adding notification
    if ((type === 'warning' || type === 'error') && !settings.criticalEnabled) {
      return;
    }
    if (type === 'success' && !settings.successEnabled) {
      return;
    }

    const id = this.nextId++;
    const notification: Notification = { id, message, type, timestamp: new Date() };

    this.notifications.update(current => [notification, ...current]);
  }

  removeNotification(id: number): void {
    this.notifications.update(current => current.filter(n => n.id !== id));
  }

  clearAllNotifications(): void {
    this.notifications.set([]);
  }
}