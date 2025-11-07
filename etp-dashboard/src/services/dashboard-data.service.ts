
import { Injectable, OnDestroy, signal, inject, effect, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { firstValueFrom } from 'rxjs';

// IMPORTANT: This service now fetches data from a mocked API endpoint.
// In a real-world application, you would replace the mock interceptor with a real backend server
// that connects to your AWS database.

export interface ChartDataPoint {
  time: string;
  value: number;
}

export interface HistoricalParameterData {
  chartData: ChartDataPoint[];
  tableData: { date: string; avg: number; min: number; max: number }[];
}

export interface HistoricalData {
  inflow: {
    flow: HistoricalParameterData;
    tds: HistoricalParameterData;
    ph: HistoricalParameterData;
  };
  effluent: {
    flow: HistoricalParameterData;
    tds: HistoricalParameterData;
    ph: HistoricalParameterData;
  };
}


interface SubKpiMetric {
  label: string;
  value: string | number;
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardDataService implements OnDestroy {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  private intervalId: any;
  private currentInterval = signal<number>(3000); // Default 3 seconds

  // Loading state signals
  isInitialLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);

  // State to track if an alert has already been sent for a parameter
  private alertStatus = {
    flow: false,
    tds: false,
    ph: false,
    conductivity: false,
  };

  // Define safe operating ranges for effluent parameters
  private readonly safeRanges = {
    flow: { min: 200, max: 230 },
    tds: { min: 40, max: 50 },
    ph: { min: 6.5, max: 7.5 },
    conductivity: { min: 60, max: 70 },
  };
  
  // --- Data Signals ---
  kpiData = signal<any[]>([]);
  influentSubKpis = signal<any>({ title: 'Influent Parameter', metrics: [] });
  effluentSubKpis = signal<any>({ title: 'Effluent Parameter', metrics: [] });
  influentParams = signal<any[]>([]);
  effluentParams = signal<any[]>([]);
  pumpStatus = signal<any[]>([]);
  pumpStage1A = signal<any>({});
  pumpStage1B = signal<any>({});
  pumpStage1C = signal<any>({});
  pumpStage2A = signal<any>({});
  pumpStage2B = signal<any>({});
  pumpStage2C = signal<any>({});
  acidDosingParams = signal<any[]>([]);
  dailyFlowData = signal<ChartDataPoint[]>([]);
  tdsData = signal<ChartDataPoint[]>([]);
  dailyTdsData = signal<ChartDataPoint[]>([]);
  phData = signal<ChartDataPoint[]>([]);


  constructor() {
    effect(() => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      
      const interval = this.currentInterval();

      if (interval > 0) {
        this._fetchData(); // Update once immediately on change
        this.intervalId = setInterval(() => {
          this._fetchData();
        }, interval);
      } else {
        // If paused, ensure we've done at least one initial load.
        if (this.isInitialLoading()) {
            this._fetchData();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  setRefreshInterval(milliseconds: number): void {
    this.currentInterval.set(milliseconds);
  }

  getRefreshInterval(): Signal<number> {
    return this.currentInterval.asReadonly();
  }

  private _fetchData(): void {
    if (this.isRefreshing()) {
      return; // Prevent overlapping requests
    }
    this.isRefreshing.set(true);

    this.http.get<any>('/api/dashboard-data').subscribe({
      next: data => {
        this.kpiData.set(data.kpiData);
        this.influentSubKpis.set(data.influentSubKpis);
        this.effluentSubKpis.set(data.effluentSubKpis);
        this.influentParams.set(data.influentParams);
        this.effluentParams.set(data.effluentParams);
        this.pumpStatus.set(data.pumpStatus);
        this.pumpStage1A.set(data.pumpStage1A);
        this.pumpStage1B.set(data.pumpStage1B);
        this.pumpStage1C.set(data.pumpStage1C);
        this.pumpStage2A.set(data.pumpStage2A);
        this.pumpStage2B.set(data.pumpStage2B);
        this.pumpStage2C.set(data.pumpStage2C);
        this.acidDosingParams.set(data.acidDosingParams);
        this.dailyFlowData.set(data.dailyFlowData);
        this.tdsData.set(data.tdsData);
        this.dailyTdsData.set(data.dailyTdsData);
        this.phData.set(data.phData);

        this._checkEffluentParameters();
        if (this.isInitialLoading()) {
          this.isInitialLoading.set(false);
        }
      },
      error: err => {
        console.error('Failed to fetch dashboard data', err);
        this.notificationService.addNotification('Could not refresh dashboard data.', 'error');
        if (this.isInitialLoading()) {
            this.isInitialLoading.set(false);
        }
      },
      complete: () => {
        this.isRefreshing.set(false);
      }
    });
  }

  private _checkEffluentParameters(): void {
    const effluentMetrics = this.effluentSubKpis()?.metrics;
    if (!effluentMetrics) return;
    
    // Helper function to check a single metric
    const checkMetric = (
      label: 'flow' | 'tds' | 'ph' | 'conductivity',
      metricName: string,
      unit: string
    ) => {
      const metric = effluentMetrics.find((m: SubKpiMetric) => m.label.toLowerCase().includes(metricName));
      if (!metric) return;

      const value = metric.value as number;
      const range = this.safeRanges[label];

      if (value < range.min || value > range.max) {
        if (!this.alertStatus[label]) {
          this.notificationService.addNotification(
            `CRITICAL: Effluent ${metricName} is out of range: ${value.toFixed(2)} ${unit}.`, 'warning'
          );
          this.alertStatus[label] = true;
        }
      } else {
        if (this.alertStatus[label]) {
          this.notificationService.addNotification(
            `Effluent ${metricName} is back to normal range.`, 'success'
          );
          this.alertStatus[label] = false;
        }
      }
    };

    checkMetric('flow', 'flow', 'm³/hr');
    checkMetric('tds', 'tds', 'ppm');
    checkMetric('ph', 'ph', '');
    checkMetric('conductivity', 'conductivity', 'Micron');
  }
  
  getHistoricalData(startDateStr: string, endDateStr: string): Promise<HistoricalData> {
    const httpCall = this.http.get<HistoricalData>('/api/historical-data', {
      params: { startDate: startDateStr, endDate: endDateStr }
    });
    // Convert observable to promise to match the existing component's expectation
    return firstValueFrom(httpCall);
  }
}
