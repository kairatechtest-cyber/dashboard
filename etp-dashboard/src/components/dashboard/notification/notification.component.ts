import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
  notifications = this.notificationService.notifications;

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
      case 'success': return 'bg-green-800/80 border-green-600';
      case 'warning': return 'bg-yellow-800/80 border-yellow-600';
      case 'error': return 'bg-red-800/80 border-red-600';
      default: return 'bg-gray-800 border-gray-600';
    }
  }
}
