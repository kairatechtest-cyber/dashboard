import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SubKpiMetric {
  label: string;
  value: string | number;
  color: string;
}

@Component({
  selector: 'app-sub-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sub-kpi-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubKpiCardComponent {
  title = input.required<string>();
  metrics = input.required<SubKpiMetric[]>();
}
