import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private fb: FormBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  isLoading = signal(false);
  message = signal<string | null>(null);

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      this.message.set('Please enter a valid email address.');
      return;
    }

    this.isLoading.set(true);
    this.message.set(null);

    const email = this.forgotPasswordForm.value.email!;

    try {
      await this.authService.requestPasswordReset(email);
      this.message.set(
        'If an account with this email exists, a password reset link has been sent. Please check your inbox (and the browser console for the mock link).'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
