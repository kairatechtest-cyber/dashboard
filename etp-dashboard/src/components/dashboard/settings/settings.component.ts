
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../services/settings.service';
import { DashboardDataService } from '../../../services/dashboard-data.service';
import { NotificationService } from '../../../services/notification.service';
import { ProfileComponent } from '../profile/profile.component';
import { DatabaseSettingsComponent } from '../database-settings/database-settings.component';

type SettingsTab = 'profile' | 'application' | 'database';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ProfileComponent, DatabaseSettingsComponent],
  templateUrl: './settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  settingsService = inject(SettingsService);
  dataService = inject(DashboardDataService);
  private notificationService = inject(NotificationService);

  settings = this.settingsService.settings;
  selectedRefreshRate = this.dataService.getRefreshInterval();
  activeTab = signal<SettingsTab>('profile');

  refreshOptions = [
    { label: '3 Seconds', value: 3000 },
    { label: '5 Seconds', value: 5000 },
    { label: '10 Seconds', value: 10000 },
    { label: '1 Minute', value: 60000 },
    { label: '2 Minutes', value: 120000 },
    { label: '5 Minutes', value: 300000 },
    { label: '1 Day', value: 86400000 },
    { label: 'Paused', value: 0 },
  ];

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  updateNotificationSetting(event: Event, key: 'criticalEnabled' | 'successEnabled') {
    const input = event.target as HTMLInputElement;
    this.settingsService.updateNotificationSettings(key, input.checked);
    this.notificationService.addNotification('Settings updated successfully.', 'success');
  }

  updateRefreshRate(event: Event) {
    const radio = event.target as HTMLInputElement;
    const newRate = parseInt(radio.value, 10);
    this.dataService.setRefreshInterval(newRate);
    this.notificationService.addNotification('Refresh rate updated successfully.', 'success');
  }
}
