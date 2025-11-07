import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

// Re-using the validator from signup component
export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  return password && confirmPassword && password.value !== confirmPassword.value ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private fb: FormBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  
  private token: string | null = null;

  resetPasswordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatchValidator });

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.errorMessage.set('No reset token found. Please request a new reset link.');
    }
  }

  async onSubmit(): Promise<void> {
    this.resetPasswordForm.markAllAsTouched();
    if (this.resetPasswordForm.invalid || !this.token) {
      this.errorMessage.set('Please fill out all fields correctly.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { password } = this.resetPasswordForm.value;

    try {
      const success = await this.authService.resetPassword(this.token, password!);
      if (success) {
        this.successMessage.set('Password has been reset successfully. Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 3000);
      } else {
        this.errorMessage.set('This link may be invalid or expired. Please try again.');
      }
    } catch (error) {
      this.errorMessage.set('An unexpected error occurred.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
