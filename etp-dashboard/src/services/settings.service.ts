import { Injectable, signal } from '@angular/core';

export interface AppSettings {
  notifications: {
    criticalEnabled: boolean;
    successEnabled: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly storageKey = 'etp_dashboard_settings';
  
  settings = signal<AppSettings>(this.loadSettings());

  private loadSettings(): AppSettings {
    const storedSettings = localStorage.getItem(this.storageKey);
    if (storedSettings) {
      try {
        return JSON.parse(storedSettings);
      } catch (e) {
        console.error('Error parsing settings from localStorage', e);
      }
    }
    // Default settings
    return {
      notifications: {
        criticalEnabled: true,
        successEnabled: true,
      },
    };
  }

  private saveSettings(settings: AppSettings): void {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  updateNotificationSettings(key: keyof AppSettings['notifications'], value: boolean): void {
    this.settings.update(currentSettings => {
      const newSettings = {
        ...currentSettings,
        notifications: {
          ...currentSettings.notifications,
          [key]: value,
        },
      };
      this.saveSettings(newSettings);
      return newSettings;
    });
  }
}