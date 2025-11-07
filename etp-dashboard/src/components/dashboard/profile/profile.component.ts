import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  // FIX: Explicitly type `fb` to resolve type inference issue with `inject`.
  private fb: FormBuilder = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  user = this.authService.currentUser;
  isEditing = signal(false);
  isLoading = signal(false);
  isUploadingImage = signal(false);

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.resetForm();
  }

  toggleEdit(): void {
    if (this.isEditing()) {
      this.resetForm();
    }
    this.isEditing.update(value => !value);
  }

  private resetForm(): void {
    const currentUser = this.user();
    if (currentUser) {
      this.profileForm.patchValue({
        name: currentUser.name,
        phone: currentUser.phone,
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.notificationService.addNotification('Please fill in all fields correctly.', 'error');
      return;
    }

    this.isLoading.set(true);
    const { name, phone } = this.profileForm.value;

    try {
      const success = await this.authService.updateCurrentUser({ name: name!, phone: phone! });
      if (success) {
        this.notificationService.addNotification('Profile updated successfully!', 'success');
        this.isEditing.set(false);
      } else {
        this.notificationService.addNotification('Failed to update profile.', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      this.notificationService.addNotification('An unexpected error occurred.', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.notificationService.addNotification('Please select a valid image file.', 'error');
      return;
    }

    // 2MB size limit
    if (file.size > 2 * 1024 * 1024) {
      this.notificationService.addNotification('Image size cannot exceed 2MB.', 'error');
      return;
    }

    this.isUploadingImage.set(true);

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const imageDataUrl = e.target.result;
      try {
        const success = await this.authService.updateUserProfileImage(imageDataUrl);
        if (success) {
          this.notificationService.addNotification('Profile image updated successfully!', 'success');
        } else {
          this.notificationService.addNotification('Failed to update profile image.', 'error');
        }
      } catch (error) {
        console.error('Profile image upload error:', error);
        this.notificationService.addNotification('An unexpected error occurred during upload.', 'error');
      } finally {
        this.isUploadingImage.set(false);
        // Reset file input value to allow re-selection of the same file
        input.value = '';
      }
    };
    reader.readAsDataURL(file);
  }
}
