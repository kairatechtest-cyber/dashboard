import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

// Custom validator to check if passwords match
export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  // FIX: Explicitly type `fb` to resolve type inference issue with `inject`.
  private fb: FormBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  isFormLoading = signal(false);
  isGoogleLoading = signal(false);
  isMicrosoftLoading = signal(false);
  signupError = signal<string | null>(null);

  signupForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  }, { validators: passwordsMatchValidator });

  async onSubmit() {
    this.signupForm.markAllAsTouched();
    if (this.signupForm.invalid) {
      this.signupError.set('Please fill out all fields correctly.');
      return;
    }

    this.isFormLoading.set(true);
    this.signupError.set(null);

    const { name, email, phone, password } = this.signupForm.value;

    try {
      const success = await this.authService.signup(name!, email!, phone!, password!);
      if (!success) {
        this.signupError.set('Could not create account. Email might already be in use.');
      }
      // On success, the service will navigate away automatically.
    } catch (error) {
      this.signupError.set('An unexpected error occurred.');
    } finally {
      this.isFormLoading.set(false);
    }
  }

  async loginWithProvider(provider: 'Google' | 'Microsoft') {
    const loadingSignal = provider === 'Google' ? this.isGoogleLoading : this.isMicrosoftLoading;
    loadingSignal.set(true);
    this.signupError.set(null);
    try {
        const success = await this.authService.loginWithProvider(provider);
        if (!success) {
           this.signupError.set('Could not log in with provider.');
        }
    } catch (error) {
        this.signupError.set('An unexpected error occurred with social login.');
    } finally {
        loadingSignal.set(false);
    }
  }
}
