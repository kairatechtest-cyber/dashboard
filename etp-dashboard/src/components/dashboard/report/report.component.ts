
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ReportService } from '../../../services/report.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent {
  // FIX: Explicitly type `fb` to resolve type inference issue with `inject`.
  private fb: FormBuilder = inject(FormBuilder);
  private reportService = inject(ReportService);
  private notificationService = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);
  private authService = inject(AuthService);

  isGenerating = signal(false);
  isSendingEmail = signal(false);
  isEmailModalOpen = signal(false);
  
  // PDF Preview signals
  pdfPreviewUrl = signal<string | null>(null);
  generatedPdfDoc = signal<any | null>(null);
  pdfFileName = signal<string>('report.pdf');
  pdfPreviewSafeUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfPreviewUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  private today = new Date();
  private weekAgo = new Date(this.today.getTime() - 7 * 24 * 60 * 60 * 1000);

  reportForm = this.fb.group({
    reportType: ['realtime' as 'realtime' | 'historical', Validators.required],
    startDate: [this.formatDateTimeLocal(this.weekAgo), Validators.required],
    endDate: [this.formatDateTimeLocal(this.today), Validators.required],
  });
  
  emailForm = this.fb.group({
    recipientEmail: [this.authService.currentUser()?.email || '', [Validators.required, Validators.email]],
    message: [''],
  });

  async onGenerateReport(): Promise<void> {
    if (this.reportForm.invalid) {
      this.notificationService.addNotification('Please select a valid report type and date range.', 'error');
      return;
    }

    this.isGenerating.set(true);
    this.resetPreview();
    
    const { reportType, startDate, endDate } = this.reportForm.value;

    try {
      let result;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      if (reportType === 'realtime') {
        result = await this.reportService.generateRealtimeRangePdfReport(startDate!, endDate!);
        this.pdfFileName.set(`ETP_Operational_Report_${timestamp}.pdf`);
      } else { // historical
        result = await this.reportService.generateHistoricalPdfReport(startDate!, endDate!);
        this.pdfFileName.set(`ETP_Historical_Report_${timestamp}.pdf`);
      }

      this.generatedPdfDoc.set(result.doc);
      this.pdfPreviewUrl.set(result.dataUrl);
      this.notificationService.addNotification('Report generated successfully.', 'success');
    } catch (error) {
      console.error('Failed to generate PDF report', error);
      this.notificationService.addNotification('Failed to generate PDF report.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }
  
  downloadPreviewedPdf(): void {
    const doc = this.generatedPdfDoc();
    if (doc) {
      doc.save(this.pdfFileName());
      this.notificationService.addNotification('Report download started.', 'success');
    } else {
      this.notificationService.addNotification('Could not download report. Please generate one first.', 'error');
    }
  }

  resetPreview(): void {
    this.pdfPreviewUrl.set(null);
    this.generatedPdfDoc.set(null);
  }
  
  openEmailModal(): void {
    const user = this.authService.currentUser();
    const startDate = new Date(this.reportForm.value.startDate ?? '').toLocaleString();
    const endDate = new Date(this.reportForm.value.endDate ?? '').toLocaleString();
    this.emailForm.reset({
      recipientEmail: user?.email || '',
      message: `Please find the attached ETP dashboard report for the period ${startDate} to ${endDate}.`
    });
    this.isEmailModalOpen.set(true);
  }

  closeEmailModal(): void {
    this.isEmailModalOpen.set(false);
  }
  
  async onSendEmail(): Promise<void> {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      this.notificationService.addNotification('Please enter a valid recipient email.', 'error');
      return;
    }
    const pdfUrl = this.pdfPreviewUrl();
    if (!pdfUrl) {
      this.notificationService.addNotification('No report generated to send.', 'error');
      return;
    }

    this.isSendingEmail.set(true);
    const { recipientEmail, message } = this.emailForm.value;

    try {
      const success = await this.reportService.emailReport(recipientEmail!, message!, pdfUrl);
      if (success) {
        this.notificationService.addNotification(`Report successfully sent to ${recipientEmail}.`, 'success');
        this.closeEmailModal();
      } else {
        throw new Error('Simulated API failure');
      }
    } catch (error) {
      console.error('Failed to send report email', error);
      this.notificationService.addNotification('Failed to send the report. Please try again.', 'error');
    } finally {
      this.isSendingEmail.set(false);
    }
  }

  private formatDateTimeLocal(date: Date): string {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  }
}
