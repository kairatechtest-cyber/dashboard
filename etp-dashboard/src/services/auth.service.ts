import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ActivityLogService } from './activity-log.service';
import { UserDataService } from './user-data.service';

export interface CurrentUser {
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router: Router = inject(Router);
  private http = inject(HttpClient);
  private activityLogService = inject(ActivityLogService);
  private userDataService = inject(UserDataService);
  
  private readonly tokenKey = 'authToken';
  
  currentUser = signal<CurrentUser | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());

  constructor() {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this._validateAndSetToken(token);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private _decodeToken(token: string): any {
    try {
      // A real JWT would have a signature, but for this mock, we only need the payload.
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  }
  
  private _validateAndSetToken(token: string): void {
    const payload = this._decodeToken(token);
    if (payload && payload.exp * 1000 > Date.now()) {
      this.currentUser.set({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        profileImage: payload.profileImage,
      });
      localStorage.setItem(this.tokenKey, token);
    } else {
      this.logout();
    }
  }

  private async _handleAuthRequest(request: Promise<AuthResponse>, successLog: string, provider?: string): Promise<boolean> {
      try {
        const response = await request;
        if (response && response.token) {
            this._validateAndSetToken(response.token);
            const user = this.currentUser();
            if(user) {
              if (provider) {
                this.activityLogService.logActivity(user.email, `User logged in with ${provider}`);
              } else {
                this.activityLogService.logActivity(user.email, successLog);
                this.activityLogService.logActivity(user.email, 'User logged in');
              }
            }
            this.router.navigate(['/dashboard']);
            return true;
        }
        return false;
      } catch (error) {
        console.error('Authentication failed', error);
        return false;
      }
  }

  async login(email: string, password: string): Promise<boolean> {
    const request = firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/login', { email, password })
    );
    // The "User logged in" message is handled by the generic `_handleAuthRequest` now
    return this._handleAuthRequest(request, 'User logged in');
  }

  async signup(name: string, email: string, phone: string, password: string): Promise<boolean> {
     const request = firstValueFrom(
        this.http.post<AuthResponse>('/api/auth/signup', { name, email, phone, password })
     );
     return this._handleAuthRequest(request, 'User signed up');
  }

  async loginWithProvider(provider: 'Google' | 'Microsoft'): Promise<boolean> {
    const request = firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/social-login', { provider })
    );
    return this._handleAuthRequest(request, `User logged in with ${provider}`, provider);
  }

  async updateCurrentUser(updatedDetails: { name: string; phone: string }): Promise<boolean> {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.put<AuthResponse>('/api/user/profile', updatedDetails)
      );
      if (response && response.token) {
        this._validateAndSetToken(response.token);
        // Ensure the user data view is also updated
        this.userDataService.updateUser(user.email, updatedDetails);
        this.activityLogService.logActivity(user.email, 'User updated their profile');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Profile update failed', error);
      return false;
    }
  }

  async updateUserProfileImage(imageDataUrl: string): Promise<boolean> {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.put<AuthResponse>('/api/user/profile-image', { imageDataUrl })
      );
      if (response && response.token) {
        this._validateAndSetToken(response.token);
        this.activityLogService.logActivity(user.email, 'User updated their profile image');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Profile image update failed', error);
      return false;
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    // This method will resolve successfully even if the email doesn't exist
    // to prevent user enumeration, as the backend mock will handle this.
    try {
      await firstValueFrom(
        this.http.post<void>('/api/auth/forgot-password', { email })
      );
      const user = this.currentUser();
      if (user) {
        this.activityLogService.logActivity(user.email, 'Requested password reset');
      }
    } catch (error) {
      // In a real app, you might log this for monitoring, but for the user,
      // we still pretend it worked.
      console.error('Request password reset failed', error);
    }
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post<void>('/api/auth/reset-password', { token, password })
      );
      // No token back, just success or failure.
      // Activity is logged in the interceptor upon identifying the user from the token.
      return true;
    } catch (error) {
      console.error('Password reset failed', error);
      return false;
    }
  }

  logout(): void {
    const user = this.currentUser();
    if (user) {
      this.activityLogService.logActivity(user.email, 'User logged out');
    }
    this.currentUser.set(null);
    localStorage.removeItem(this.tokenKey);
    // Keep legacy items removal for cleanup, can be removed later
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
