import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';
import { ParameterTableComponent } from '../parameter-table/parameter-table.component';
import { PumpStatusComponent } from '../pump-status/pump-status.component';
import { ChartCardComponent } from '../chart-card/chart-card.component';
import { DashboardDataService } from '../../../services/dashboard-data.service';
import { SubKpiCardComponent } from '../sub-kpi-card/sub-kpi-card.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    ParameterTableComponent,
    PumpStatusComponent,
    ChartCardComponent,
    SubKpiCardComponent,
  ],
  templateUrl: './overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewComponent {
  dataService = inject(DashboardDataService);

  isInitialLoading = this.dataService.isInitialLoading;

  kpiData = this.dataService.kpiData;
  influentSubKpis = this.dataService.influentSubKpis;
  effluentSubKpis = this.dataService.effluentSubKpis;
  influentParams = this.dataService.influentParams;
  effluentParams = this.dataService.effluentParams;
  pumpStatus = this.dataService.pumpStatus;
  pumpStatusHeaders = ['Pump', 'Status', 'Condu', 'RPM', 'Currer', 'Inst. Fl', 'Cumul', 'Life (%)', 'Diff. P'];

  dailyFlowData = this.dataService.dailyFlowData;
  tdsData = this.dataService.tdsData;
  dailyTdsData = this.dataService.dailyTdsData;
  phData = this.dataService.phData;

  pumpStage1A = this.dataService.pumpStage1A;
  pumpStage1B = this.dataService.pumpStage1B;
  pumpStage1C = this.dataService.pumpStage1C;
  pumpStage2A = this.dataService.pumpStage2A;
  pumpStage2B = this.dataService.pumpStage2B;
  pumpStage2C = this.dataService.pumpStage2C;

  acidDosingParams = this.dataService.acidDosingParams;
}