import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  // FIX: Corrected typo from `Change.OnPush` to `ChangeDetectionStrategy.OnPush`.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  // FIX: Explicitly type `fb` to resolve type inference issue with `inject`.
  private fb: FormBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  
  isFormLoading = signal(false);
  isGoogleLoading = signal(false);
  isMicrosoftLoading = signal(false);
  loginError = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['name@example.com', [Validators.required, Validators.email]],
    password: ['password', [Validators.required]],
  });

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginError.set('Please enter valid credentials.');
      return;
    }

    this.isFormLoading.set(true);
    this.loginError.set(null);

    const email = this.loginForm.value.email ?? '';
    const password = this.loginForm.value.password ?? '';
    
    try {
      const success = await this.authService.login(email, password);
      if (!success) {
        this.loginError.set('Invalid email or password.');
      }
      // On success, the service will navigate away automatically.
    } catch (error) {
        this.loginError.set('An unexpected error occurred. Please try again.');
    } finally {
        this.isFormLoading.set(false);
    }
  }

  async loginWithProvider(provider: 'Google' | 'Microsoft') {
    const loadingSignal = provider === 'Google' ? this.isGoogleLoading : this.isMicrosoftLoading;
    loadingSignal.set(true);
    this.loginError.set(null);
    try {
        const success = await this.authService.loginWithProvider(provider);
        if (!success) {
          this.loginError.set('Could not log in with provider.');
        }
    } catch (error) {
        this.loginError.set('An unexpected error occurred with social login.');
    } finally {
        loadingSignal.set(false);
    }
  }
}
