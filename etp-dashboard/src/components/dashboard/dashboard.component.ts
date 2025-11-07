

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
// FIX: Import 'RouterOutlet' from '@angular/router' to resolve the 'Cannot find name RouterOutlet' error.
import { Router, RouterLink, RouterLinkActive, NavigationExtras, RouterOutlet } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HeaderComponent } from './header/header.component';
import { DashboardDataService } from '../../services/dashboard-data.service';
import { NotificationService } from '../../services/notification.service';
import { SearchService, SearchResult } from '../../services/search.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private dataService = inject(DashboardDataService);
  private notificationService = inject(NotificationService);
  private fb: FormBuilder = inject(FormBuilder);
  private searchService = inject(SearchService);
  private router = inject(Router);
  themeService = inject(ThemeService);

  isRefreshing = this.dataService.isRefreshing;
  notificationCount = computed(() => this.notificationService.notifications().length);

  // Search signals
  isSearchOpen = signal(false);
  searchResults = signal<SearchResult[]>([]);
  isSearching = signal(false);
  private searchDebounceTimer: any;

  searchForm = this.fb.group({
    query: [''],
  });

  navLinks = [
    { path: 'overview', label: 'Real-Time', icon: 'M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM10.5 0a10.5 10.5 0 100 21 10.5 10.5 0 000-21zM10.5 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3z' },
    { path: 'history', label: 'Historical', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    { path: 'alerts', label: 'Alerts', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { path: 'reports', label: 'Download Report', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3' },
    { path: 'settings', label: 'Settings', icon: 'M9.594 3.94c.09-.542.56-1.007 1.11-1.226l.554-.221a.75.75 0 01.892 0l.554.221c.55.219 1.02.684 1.11 1.226l.094.542c.065.378.344.668.723.758l.542.13c.571.135 1.007.57 1.226 1.11l.221.554a.75.75 0 010 .892l-.221.554c-.219.55-.684 1.02-1.226 1.11l-.542.13c-.378.09-.658.38-.723.758l-.094-.542c-.09.542-.56-1.007-1.11-1.226l-.554.221a.75.75 0 01-.892 0l-.554-.221c-.55-.219-1.02-.684-1.11-1.226l-.094-.542c-.065-.378-.344-.668-.723-.758l-.542-.13c-.571-.135-1.007.57-1.226 1.11l-.221.554a.75.75 0 010-.892l.221.554c.219.55.684 1.02 1.226 1.11l.542-.13c.378.09.658.38.723.758l.094-.542zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z' },
    { path: 'activity', label: 'Activity Log', icon: 'M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5-13.5h16.5' },
  ];

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

  selectedRefreshRate = this.dataService.getRefreshInterval();

  onSearchInput(): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
        this.performSearch();
    }, 300); // 300ms debounce
  }

  async performSearch(): Promise<void> {
    const query = this.searchForm.value.query?.trim();
    if (!query) {
      this.searchResults.set([]);
      this.isSearchOpen.set(true); 
      return;
    }
    this.isSearching.set(true);
    this.isSearchOpen.set(true);
    
    const results = await this.searchService.search(query);
    this.searchResults.set(results);
    this.isSearching.set(false);
  }

  openSearch(): void {
    this.isSearchOpen.set(true);
    this.performSearch();
  }

  closeSearch(): void {
    clearTimeout(this.searchDebounceTimer);
    this.isSearchOpen.set(false);
    this.searchResults.set([]);
    this.searchForm.reset();
  }

  navigateToResult(result: SearchResult): void {
    const navigationExtras: NavigationExtras = result.highlight 
      ? { queryParams: { highlight: result.highlight } } 
      : {};
    this.router.navigate([result.link], navigationExtras);
    this.closeSearch();
  }

  onRefreshRateChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newRate = parseInt(selectElement.value, 10);
    this.dataService.setRefreshInterval(newRate);
  }
}