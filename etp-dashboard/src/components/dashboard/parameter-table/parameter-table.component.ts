import { ChangeDetectionStrategy, Component, input, inject, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvExportService } from '../../../services/csv-export.service';
import { NotificationService } from '../../../services/notification.service';

export interface Parameter {
  name: string;
  value: string | number;
  [key: string]: any; // Allow other properties
}

@Component({
  selector: 'app-parameter-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parameter-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterTableComponent {
  title = input.required<string>();
  data = input.required<Parameter[]>();
  headers = input<string[]>(['Parameter', 'Value']);
  valueColumnName = input<string>('value');
  highlightedRow = input<string | null>(null);
  hasCardShell = input<boolean>(true);
  exportable = input<boolean>(false);
  exportTitle = input<string>();

  private elementRef = inject(ElementRef);
  private csvExportService = inject(CsvExportService);
  private notificationService = inject(NotificationService);

  constructor() {
    effect(() => {
      const rowNameToHighlight = this.highlightedRow();
      if (rowNameToHighlight) {
        // A small timeout to allow the DOM to render before we try to find the element.
        setTimeout(() => {
          const hostElement = this.elementRef.nativeElement as HTMLElement;
          // Use a data attribute for a more robust selector.
          const rowElement = hostElement.querySelector(`[data-row-name="${rowNameToHighlight}"]`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    });
  }
  
  exportToCsv(): void {
    const titleForExport = this.exportTitle() || this.title();
    const data = this.data();
    const headers = this.headers();
    
    if (!data || data.length === 0) {
      this.notificationService.addNotification('No data to export.', 'warning');
      return;
    }

    try {
      const rows = data.map(item => {
        // First column is always item.name
        const row: (string | number)[] = [item.name];
        // Subsequent columns are derived using getValue logic for consistency
        headers.slice(1).forEach(header => {
          if (header === 'Status') {
            row.push(item.rpm > 500 ? 'Running' : 'Idle');
          } else {
            row.push(this.getValue(item, header));
          }
        });
        return row;
      });

      const sanitizedTitle = titleForExport.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}_export_${new Date().toISOString().split('T')[0]}.csv`;

      this.csvExportService.exportToCsv(rows, headers, filename);
      this.notificationService.addNotification(`Successfully exported "${titleForExport}" to CSV.`, 'success');
    } catch (error) {
      console.error('CSV Export failed', error);
      this.notificationService.addNotification('Failed to export data to CSV.', 'error');
    }
  }

  /**
   * Returns the appropriate CSS class for a table cell based on its header.
   * This is used to color specific columns differently.
   * @param header The header of the column.
   * @returns A string of Tailwind CSS classes.
   */
  getTdClass(header: string): string {
    if (header === 'RPM') {
      return 'text-green-400';
    }
    if (this.headers().length > 2) { // More than just 'Parameter' and 'Value'
        return 'text-yellow-400';
    }
    return 'text-yellow-400';
  }

  /**
   * Retrieves the correct value from a data item based on the column header.
   * This logic is moved from the template to prevent template parsing errors.
   * It handles different key formats by trying a direct lowercase match first,
   * then falling back to a sanitized key for more complex headers.
   * If the found value is null or undefined, it returns a '-' placeholder.
   * @param item The data object for the current row.
   * @param header The header string for the column.
   * @returns The corresponding value from the item, or '-' if not found or is null/undefined.
   */
  getValue(item: Parameter, header: string): string | number {
    const lowerCaseHeader = header.toLowerCase();
    let value: string | number | null | undefined;

    // Attempt 1: Check for a direct match with the lowercase header.
    // This works for simple keys like 'Value', 'Tds', 'Flow', and keys with spaces like 'Power eff'.
    if (item[lowerCaseHeader] !== undefined) {
      value = item[lowerCaseHeader];
    } else {
      // Attempt 2: If no direct match, try sanitizing the key.
      // This is required for special cases in the pump status table, for example:
      // 'Inst. Fl' -> 'instfl'
      // 'Life (%)' -> 'life'
      // 'Diff. P' -> 'diffp'
      const sanitizedKey = lowerCaseHeader
        .replace(/ \(.+\)/, '') // Handles 'Life (%)'
        .replace(/\. /g, '')    // Handles 'Inst. Fl'
        .replace('.', '');      // Handles 'Diff. P'

      value = item[sanitizedKey];
    }

    // If value is null, undefined, or not found, return '-'
    if (value === null || value === undefined) {
      return '-';
    }

    return value;
  }
}
