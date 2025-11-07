import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const APP_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./components/signup/signup.component').then(c => c.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent),
  },
  {
    path: 'reset-password/:token',
    loadComponent: () => import('./components/reset-password/reset-password.component').then(c => c.ResetPasswordComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(c => c.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./components/dashboard/overview/overview.component').then(c => c.OverviewComponent),
      },
      {
        path: 'history',
        loadComponent: () => import('./components/dashboard/historical/historical.component').then(c => c.HistoricalComponent),
      },
      {
        path: 'alerts',
        loadComponent: () => import('./components/dashboard/alerts/alerts.component').then(c => c.AlertsComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./components/dashboard/report/report.component').then(c => c.ReportComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./components/dashboard/profile/profile.component').then(c => c.ProfileComponent),
      },
      {
        path: 'data-viewer',
        loadComponent: () => import('./components/dashboard/data-viewer/data-viewer.component').then(c => c.DataViewerComponent),
      },
      {
        path: 'feedback',
        loadComponent: () => import('./components/dashboard/feedback/feedback.component').then(c => c.FeedbackComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./components/dashboard/settings/settings.component').then(c => c.SettingsComponent),
      },
      {
        path: 'activity',
        loadComponent: () => import('./components/dashboard/activity-log/activity-log.component').then(c => c.ActivityLogComponent),
      },
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];