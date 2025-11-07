import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../../services/gemini.service';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-insights.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiInsightsComponent implements OnInit {
  private geminiService = inject(GeminiService);

  insights = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchInsights();
  }

  fetchInsights() {
    this.isLoading.set(true);
    this.error.set(null);
    this.insights.set(null);

    this.geminiService.generateInsights()
      .then(result => {
        this.insights.set(result);
      })
      .catch(err => {
        this.error.set(err.message || 'An unknown error occurred.');
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }
}
