
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';

import { AppComponent } from './src/app.component';
import { APP_ROUTES } from './src/app.routes';
import { mockApiInterceptor } from './src/services/mock-api.interceptor';
import { authInterceptor } from './src/services/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES, withHashLocation()),
    provideHttpClient(withInterceptors([authInterceptor, mockApiInterceptor])),
  ],
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.