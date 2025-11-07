import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ChartCardComponent, ChartDataPoint } from '../chart-card/chart-card.component';
import { ParameterTableComponent, Parameter } from '../parameter-table/parameter-table.component';
import { DashboardDataService, HistoricalData, HistoricalParameterData } from '../../../services/dashboard-data.service';

/**
 * Custom validator to ensure the end date is not before the start date.
 * @param control The form group containing the date controls.
 * @returns A ValidationErrors object if invalid, otherwise null.
 */
function endDateAfterStartDateValidator(control: AbstractControl): ValidationErrors | null {
  const startDateControl = control.get('startDate');
  const endDateControl = control.get('endDate');

  if (!startDateControl || !endDateControl || !startDateControl.value || !endDateControl.value) {
    return null; // Don't validate if controls aren't present or don't have a value yet
  }

  const startDate = new Date(startDateControl.value);
  const endDate = new Date(endDateControl.value);

  if (endDate < startDate) {
    return { dateRangeInvalid: true };
  }

  return null;
}

interface TrendAnalysis {
  overallAverage: number;
  overallMin: number;
  overallMax: number;
  trend: 'Increasing' | 'Decreasing' | 'Stable';
  percentageChange: number;
  percentageChangeDisplay: string;
}

@Component({
  selector: 'app-historical',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChartCardComponent, ParameterTableComponent],
  templateUrl: './historical.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoricalComponent {
  // FIX: Explicitly type `fb` to resolve type inference issue with `inject`.
  private fb: FormBuilder = inject(FormBuilder);
  private dataService = inject(DashboardDataService);

  isLoading = signal(false);
  error = signal<string | null>(null);
  historicalData = signal<HistoricalData | null>(null);

  // Set default dates: end date is today, start date is 7 days ago
  private today = new Date();
  private weekAgo = new Date(this.today.getTime() - 7 * 24 * 60 * 60 * 1000);

  dateRangeForm = this.fb.group({
    startDate: [this.formatDate(this.weekAgo), Validators.required],
    endDate: [this.formatDate(this.today), Validators.required],
  }, { validators: endDateAfterStartDateValidator });

  tableHeaders = ['Date', 'Avg', 'Min', 'Max'];

  // --- Computed Trend Analysis ---
  inflowFlowTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.inflow.flow));
  inflowTdsTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.inflow.tds));
  inflowPhTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.inflow.ph));
  effluentFlowTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.effluent.flow));
  effluentTdsTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.effluent.tds));
  effluentPhTrend = computed(() => this.calculateTrendAnalysis(this.historicalData()?.effluent.ph));


  async onSubmit() {
    this.dateRangeForm.markAllAsTouched();
    if (this.dateRangeForm.invalid) {
      this.error.set(null); // Clear any previous API errors if form is now invalid
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.historicalData.set(null);

    const { startDate, endDate } = this.dateRangeForm.value;

    try {
      const data = await this.dataService.getHistoricalData(startDate!, endDate!);
      this.historicalData.set(data);
    } catch (e: any) {
      this.error.set('Failed to fetch historical data. This could be due to a network issue or a problem with the server. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private calculateTrendAnalysis(data: HistoricalParameterData | undefined): TrendAnalysis | null {
    if (!data || data.tableData.length === 0) {
      return null;
    }

    const dailyAverages = data.tableData.map(d => d.avg);
    const dailyMins = data.tableData.map(d => d.min);
    const dailyMaxes = data.tableData.map(d => d.max);

    const overallAverage = dailyAverages.reduce((sum, val) => sum + val, 0) / dailyAverages.length;
    const overallMin = Math.min(...dailyMins);
    const overallMax = Math.max(...dailyMaxes);

    let trend: 'Increasing' | 'Decreasing' | 'Stable' = 'Stable';
    let percentageChange = 0;
    let percentageChangeDisplay = '(0.0%)';

    if (data.chartData.length >= 2) {
      const startValue = data.chartData[0].value;
      const endValue = data.chartData[data.chartData.length - 1].value;
      
      if (startValue !== 0) {
        percentageChange = ((endValue - startValue) / Math.abs(startValue)) * 100;
      } else {
        percentageChange = endValue > 0 ? 9999 : 0;
      }

      if (percentageChange > 5) {
        trend = 'Increasing';
      } else if (percentageChange < -5) {
        trend = 'Decreasing';
      }

      if (Math.abs(percentageChange) > 1000) {
        percentageChangeDisplay = `(>${percentageChange > 0 ? '' : '-'}999%)`;
      } else {
        percentageChangeDisplay = `(${(percentageChange >= 0 ? '+' : '') + percentageChange.toFixed(1)}%)`;
      }
    }

    return {
      overallAverage,
      overallMin,
      overallMax,
      trend,
      percentageChange,
      percentageChangeDisplay
    };
  }

  // Helper to format date as YYYY-MM-DD for input[type=date]
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Transforms the daily summary data from the service into the format
   * expected by the app-parameter-table component.
   * @param data The array of daily data summaries.
   * @returns An array of `Parameter` objects for the table component.
   */
  mapTableData(data: { date: string; avg: number; min: number; max: number }[]): Parameter[] {
    // FIX: Add the 'value' property to each object to satisfy the 'Parameter' interface, which is required by app-parameter-table.
    return data.map(row => ({
      name: row.date, // Corresponds to the first header, 'Date'
      value: row.avg, // 'value' is a required property. We use the average value for it.
      avg: row.avg,   // These keys are looked up by the table component based on the headers array.
      min: row.min,
      max: row.max,
    }));
  }

  getTrendColor(trend: 'Increasing' | 'Decreasing' | 'Stable'): string {
    switch (trend) {
      case 'Increasing': return 'text-yellow-400';
      case 'Decreasing': return 'text-sky-400';
      case 'Stable': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  }
}