import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CsvExportService {
  /**
   * Triggers a browser download for a CSV file created from the provided data.
   * @param rows An array of arrays, where each inner array represents a row of data.
   * @param headers An array of strings for the CSV header row.
   * @param filename The name of the file to be downloaded.
   */
  exportToCsv(rows: (string | number)[][], headers: string[], filename: string): void {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(this.formatCsvCell).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Formats a cell's data for CSV, handling commas, quotes, and newlines.
   * @param cellData The data for a single cell.
   * @returns A CSV-safe string.
   */
  private formatCsvCell(cellData: any): string {
    const stringData = String(cellData ?? ''); // Handle null or undefined values
    // If the string contains a comma, double-quote, or newline, wrap it in double-quotes.
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
      // Escape any existing double-quotes by replacing them with two double-quotes.
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  }
}
