import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './feedback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackComponent implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);

  isLoading = signal(false);

  feedbackForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.feedbackForm.patchValue({
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }

  onSubmit(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    // Simulate API call
    setTimeout(() => {
      try {
        console.log('Feedback Submitted:', this.feedbackForm.value);
        this.notificationService.addNotification('Thank you! Your feedback has been submitted.', 'success');
        this.feedbackForm.get('message')?.reset();
      } catch (error) {
        console.error('Feedback submission failed:', error);
        this.notificationService.addNotification('Something went wrong. Please try again.', 'error');
      } finally {
        this.isLoading.set(false);
      }
    }, 1000);
  }
}
