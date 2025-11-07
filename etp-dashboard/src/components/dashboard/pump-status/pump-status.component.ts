import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PumpData {
  conductivity: number;
  rpm: number;
  current: number;
  cumulativeFlow: number;
  life: number;
}

@Component({
  selector: 'app-pump-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pump-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PumpStatusComponent {
  title = input.required<string>();
  data = input.required<PumpData>();
}