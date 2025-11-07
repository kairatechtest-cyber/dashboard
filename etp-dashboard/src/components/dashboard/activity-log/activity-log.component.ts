import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLog, ActivityLogService } from '../../../services/activity-log.service';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-log.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityLogComponent {
  activityLogService = inject(ActivityLogService);

  // State for search and pagination
  searchQuery = signal('');
  currentPage = signal(1);
  readonly itemsPerPage = 50; // As per requirement

  // Computed signal for logs that match the search query
  filteredLogs = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allLogs = this.activityLogService.logs();

    if (!query) {
      return allLogs;
    }

    return allLogs.filter(log => 
      log.user.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query)
    );
  });
  
  // Computed signal for total pages based on filtered logs
  totalPages = computed(() => {
    return Math.ceil(this.filteredLogs().length / this.itemsPerPage);
  });

  // Computed signal for the logs to be displayed on the current page
  paginatedLogs = computed(() => {
    const page = this.currentPage();
    const totalPages = this.totalPages();
    
    // Reset to page 1 if current page is out of bounds after filtering
    if (page > totalPages && totalPages > 0) {
        this.currentPage.set(1);
    }
    
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredLogs().slice(startIndex, startIndex + this.itemsPerPage);
  });

  // Method to update search query and reset pagination
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1); // Reset to first page on new search
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  trackByTimestamp(index: number, log: ActivityLog): string {
    return log.timestamp;
  }
}
