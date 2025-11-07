
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../services/notification.service';
import { DashboardDataService } from '../../../services/dashboard-data.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alerts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsComponent {
  notificationService = inject(NotificationService);
  private dataService = inject(DashboardDataService);

  notifications = this.notificationService.notifications;
  selectedRefreshRate = this.dataService.getRefreshInterval();
  
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

  onRefreshRateChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newRate = parseInt(selectElement.value, 10);
    this.dataService.setRefreshInterval(newRate);
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  getBgClass(type: string): string {
     switch (type) {
      case 'success': return 'bg-green-800/20 border-green-700/50';
      case 'warning': return 'bg-yellow-800/20 border-yellow-700/50';
      case 'error': return 'bg-red-800/20 border-red-700/50';
      default: return 'bg-gray-700/30 border-gray-600/50';
    }
  }

  trackById(index: number, notification: Notification): number {
    return notification.id;
  }
}
