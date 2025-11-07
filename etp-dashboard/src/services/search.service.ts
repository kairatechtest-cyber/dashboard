import { inject, Injectable } from '@angular/core';
import { DashboardDataService } from './dashboard-data.service';
import { NotificationService } from './notification.service';

export interface SearchResult {
  category: string;
  title: string;
  link: string; // e.g., '/dashboard/overview'
  context?: string; // e.g., "Value: 402"
  highlight?: string; // The unique identifier for the item to highlight
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private dataService = inject(DashboardDataService);
  private notificationService = inject(NotificationService);

  // Using a promise to simulate potential async search operations
  async search(query: string): Promise<SearchResult[]> {
    const lowerCaseQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    if (!lowerCaseQuery) {
      return [];
    }
    
    // Search KPIs
    this.dataService.kpiData().forEach(kpi => {
      if (kpi.title.toLowerCase().includes(lowerCaseQuery)) {
        results.push({
          category: 'KPI',
          title: kpi.title,
          context: `Value: ${kpi.value}`,
          link: '/dashboard/overview',
        });
      }
    });

    // Search Sub-KPIs
    [this.dataService.influentSubKpis(), this.dataService.effluentSubKpis()].forEach(subKpi => {
        subKpi.metrics.forEach((metric: any) => {
            if (metric.label.toLowerCase().includes(lowerCaseQuery)) {
                results.push({
                    category: subKpi.title,
                    title: metric.label,
                    context: `Value: ${metric.value}`,
                    link: '/dashboard/overview'
                });
            }
        });
    });

    // Search Parameters
    const allParams = [
      { data: this.dataService.acidDosingParams(), category: 'Acid Dosing' },
    ];

    allParams.forEach(paramGroup => {
      paramGroup.data.forEach(param => {
        if (param.name.toLowerCase().includes(lowerCaseQuery)) {
          const isHighlightable = paramGroup.category === 'Influent Parameter' || paramGroup.category === 'Effluent Parameter';
          results.push({
            category: paramGroup.category,
            title: param.name,
            context: `Value: ${param.value}`,
            link: '/dashboard/overview',
            highlight: isHighlightable ? param.name : undefined,
          });
        }
      });
    });

    // Search Pump Status
    this.dataService.pumpStatus().forEach(pump => {
        if (pump.name.toLowerCase().includes(lowerCaseQuery)) {
            results.push({
                category: 'Pump Status',
                title: `Pump ${pump.name}`,
                context: `RPM: ${pump.rpm}, Flow: ${pump.instfl}`,
                link: '/dashboard/overview'
            });
        }
    });

    // Search Alerts
    this.notificationService.notifications().forEach(notification => {
      if (notification.message.toLowerCase().includes(lowerCaseQuery)) {
        results.push({
          category: 'Alert',
          title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
          context: notification.message,
          link: '/dashboard/alerts',
        });
      }
    });

    return results;
  }
}