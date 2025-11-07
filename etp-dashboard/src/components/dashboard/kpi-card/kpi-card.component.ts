import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  unit = input<string>();
  icon = input<string>();
}