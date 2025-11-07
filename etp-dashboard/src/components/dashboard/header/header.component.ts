
import { ChangeDetectionStrategy, Component, signal, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private elementRef = inject(ElementRef);

  isDropdownOpen = signal(false);
  
  currentUser = this.authService.currentUser;

  toggleDropdown() {
    this.isDropdownOpen.update(value => !value);
  }

  logout() {
    this.isDropdownOpen.set(false);
    this.authService.logout();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }
}
