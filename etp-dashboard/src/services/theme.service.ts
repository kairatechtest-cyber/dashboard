import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  theme = signal<Theme>('light');

  constructor() {
    // Check for saved theme in local storage or user's OS preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      this.theme.set(savedTheme);
    } else if (prefersDark) {
      this.theme.set('dark');
    } else {
      this.theme.set('light');
    }

    // Effect to apply the theme class to the documentElement
    effect(() => {
      const currentTheme = this.theme();
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', currentTheme);
    });
  }

  toggleTheme(): void {
    this.theme.update(currentTheme => (currentTheme === 'light' ? 'dark' : 'light'));
  }
}
