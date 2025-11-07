import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDataPoint {
  time: string;
  value: number;
}

export interface TooltipData {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}


@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chart-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCardComponent {
  chartTitle = input.required<string>();
  yAxisLabel = input<string>();
  data = input<ChartDataPoint[]>([]);
  hasCardShell = input<boolean>(true);

  tooltip = signal<TooltipData>({ visible: false, content: '', x: 0, y: 0 });

  // Zoom and Pan state
  viewDomain = signal<{ startIndex: number; endIndex: number }>({ startIndex: 0, endIndex: -1 });
  isPanning = signal(false);
  private panStart = signal<{ x: number, domain: { startIndex: number, endIndex: number } } | null>(null);

  // NEW state for selection box
  isSelecting = signal(false);
  selectionBox = signal<{ x: number, width: number, visible: boolean }>({ x: 0, width: 0, visible: false });
  private selectionStartCoord = signal<{ x: number } | null>(null);

  // Chart dimensions
  viewBoxWidth = 100;
  viewBoxHeight = 50;
  padding = { top: 5, right: 5, bottom: 5, left: 5 };

  constructor() {
    // Reset view domain when data changes
    effect(() => {
      this.resetView();
    });
  }

  // DERIVED STATE
  isZoomed = computed(() => {
    const domain = this.viewDomain();
    const data = this.data();
    if (data.length === 0) return false;
    return domain.startIndex > 0 || domain.endIndex < data.length - 1;
  });

  visibleData = computed(() => {
    const data = this.data();
    if (data.length === 0) return [];
    const { startIndex, endIndex } = this.viewDomain();
    // +1 because slice's end is exclusive.
    return data.slice(startIndex, endIndex + 1);
  });
  
  xScale = computed(() => {
    const data = this.visibleData();
    if (data.length < 2) return () => this.padding.left;
    const domainWidth = data.length - 1;
    const rangeWidth = this.viewBoxWidth - this.padding.left - this.padding.right;
    return (index: number) => this.padding.left + (index / domainWidth) * rangeWidth;
  });

  yScale = computed(() => {
    const data = this.visibleData();
    if (data.length === 0) return () => this.viewBoxHeight - this.padding.bottom;
    const values = data.map(d => d.value);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const domainHeight = maxY - minY === 0 ? 1 : maxY - minY;
    const rangeHeight = this.viewBoxHeight - this.padding.top - this.padding.bottom;
    return (value: number) => this.viewBoxHeight - this.padding.bottom - ((value - minY) / domainHeight) * rangeHeight;
  });

  pathData = computed(() => {
    const data = this.visibleData();
    const xScale = this.xScale();
    const yScale = this.yScale();
    if (data.length < 2) return '';

    const pathParts = data.map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    return pathParts.join(' ');
  });
  
  startTimeLabel = computed(() => {
    const data = this.visibleData();
    return data.length > 0 ? data[0].time : '';
  });

  middleTimeLabel = computed(() => {
    const data = this.visibleData();
    if (data.length > 1) {
      const middleIndex = Math.floor((data.length - 1) / 2);
      return data[middleIndex].time;
    }
    return '';
  });
  
  endTimeLabel = computed(() => {
    const data = this.visibleData();
    return data.length > 1 ? data[data.length - 1].time : '';
  });

  // UI EVENT HANDLERS
  
  resetView(): void {
    const data = this.data();
    this.viewDomain.set({ startIndex: 0, endIndex: Math.max(0, data.length - 1) });
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const currentTarget = event.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    const mouseX = event.clientX - rect.left;
    const mouseRatio = mouseX / rect.width;
    const zoomFactor = event.deltaY < 0 ? 1 / 1.5 : 1.5;

    const currentDomain = this.viewDomain();
    const currentRange = currentDomain.endIndex - currentDomain.startIndex;
    const newRange = currentRange * zoomFactor;

    if (newRange < 2) return;
    if (newRange >= this.data().length) {
      this.resetView();
      return;
    }

    const anchorIndex = currentDomain.startIndex + mouseRatio * currentRange;
    let newStartIndex = Math.round(anchorIndex - mouseRatio * newRange);
    let newEndIndex = Math.round(newStartIndex + newRange);

    const totalPoints = this.data().length;
    newStartIndex = Math.max(0, newStartIndex);
    newEndIndex = Math.min(totalPoints - 1, newEndIndex);

    this.viewDomain.set({ startIndex: newStartIndex, endIndex: newEndIndex });
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    const currentTarget = event.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    if (this.isZoomed()) {
        this.isPanning.set(true);
        this.panStart.set({ x: event.clientX, domain: this.viewDomain() });
    } else {
        this.isSelecting.set(true);
        this.selectionStartCoord.set({ x: mouseX });
        this.selectionBox.set({ x: mouseX, width: 0, visible: true });
    }
  }

  onMouseMove(event: MouseEvent): void {
    const currentTarget = event.currentTarget as HTMLElement;
    const rect = currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    // Handle Panning
    const panStart = this.panStart();
    if (this.isPanning() && panStart) {
        const dx = event.clientX - panStart.x;
        const startDomain = panStart.domain;
        const range = startDomain.endIndex - startDomain.startIndex;
        if (range <= 0) return;

        const indexDelta = (dx / rect.width) * range;
        
        let newStartIndex = startDomain.startIndex - indexDelta;

        const totalPoints = this.data().length;
        const maxStartIndex = totalPoints - 1 - range;

        // Clamp the start index
        if (newStartIndex < 0) {
          newStartIndex = 0;
        } else if (newStartIndex > maxStartIndex) {
          newStartIndex = maxStartIndex;
        }

        this.viewDomain.set({
            startIndex: Math.round(newStartIndex),
            endIndex: Math.round(newStartIndex + range)
        });
        return; // Exit after handling pan
    }

    // Handle Selection
    const selectionStartCoord = this.selectionStartCoord();
    if (this.isSelecting() && selectionStartCoord) {
        const mouseX = event.clientX - rect.left;
        const startX = selectionStartCoord.x;
        const width = Math.abs(mouseX - startX);
        const x = Math.min(mouseX, startX);
        this.selectionBox.set({ x, width, visible: true });
    }
  }

  onMouseUpOrLeave(event: MouseEvent): void {
    // Finalize Panning
    if (this.isPanning()) {
        this.isPanning.set(false);
        this.panStart.set(null);
    }

    // Finalize Selection
    if (this.isSelecting()) {
        if (event.type === 'mouseup') { // Only zoom on mouseup, not mouseleave
            const selectionBox = this.selectionBox();
            const currentTarget = event.currentTarget as HTMLElement;
            const rect = currentTarget.getBoundingClientRect();

            // Only zoom if the selection width is meaningful (e.g., > 5 pixels)
            if (rect.width > 0 && selectionBox.width > 5) {
                const totalPoints = this.data().length;
                const startRatio = selectionBox.x / rect.width;
                const endRatio = (selectionBox.x + selectionBox.width) / rect.width;
                
                let startIndex = Math.floor(startRatio * totalPoints);
                let endIndex = Math.ceil(endRatio * totalPoints);

                // Clamp values and ensure there are at least 2 points in the new view
                startIndex = Math.max(0, startIndex);
                endIndex = Math.min(totalPoints - 1, endIndex);

                if (endIndex > startIndex) {
                    this.viewDomain.set({ startIndex, endIndex });
                }
            }
        }
        
        // Reset selection state for both mouseup and mouseleave
        this.isSelecting.set(false);
        this.selectionStartCoord.set(null);
        this.selectionBox.set({ x: 0, width: 0, visible: false });
    }
  }

  showTooltip(event: MouseEvent, point: ChartDataPoint) {
    const circle = event.currentTarget as SVGCircleElement;
    const container = circle.closest('.relative');
    if (!container) return;
    
    const rect = circle.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    this.tooltip.set({
      visible: true,
      content: `${point.time}: ${point.value.toFixed(2)}`,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    });
  }

  hideTooltip() {
    this.tooltip.update(t => ({ ...t, visible: false }));
  }
}
