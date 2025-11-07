import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserDataService } from '../../../services/user-data.service';

@Component({
  selector: 'app-data-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-viewer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataViewerComponent {
  private userDataService = inject(UserDataService);
  users = this.userDataService.users;

  headers = ['Name', 'Email', 'Phone', 'Signup Date'];
  
  headerTooltips = {
    'Name': "The user's full name as provided during signup.",
    'Email': "The user's unique email address, used for logging in.",
    'Phone': "The user's contact phone number.",
    'Signup Date': "The date and time when the user created their account.",
  };
}