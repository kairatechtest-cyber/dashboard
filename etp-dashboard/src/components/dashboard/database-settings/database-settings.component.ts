import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatabaseService, DatabaseType, ConnectionStatus, DatabaseSettings } from '../../../services/database.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-database-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './database-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatabaseSettingsComponent {
  private fb: FormBuilder = inject(FormBuilder);
  databaseService = inject(DatabaseService);
  private notificationService = inject(NotificationService);

  viewMode = signal<'list' | 'form'>('list');
  editingConnection = signal<DatabaseSettings | null>(null);
  isConnectionVerified = signal(false);
  connectionTestMessage = signal<string | null>(null);

  private localDefaults = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'etp_dashboard',
  };

  private awsDefaults = {
    host: 'wipro-db.cdkuy8m2s6zd.ap-south-1.rds.amazonaws.com',
    port: 5432,
    user: 'postgres',
    password: 'AB5wkYaStktPuzzYLEwX',
    database: 'wipro-db',
  };

  dbSettingsForm = this.fb.group({
    id: [''], // Hidden field to track the connection being edited
    name: ['', Validators.required],
    dbType: ['local' as DatabaseType, Validators.required],
    host: ['', Validators.required],
    port: [5432, [Validators.required, Validators.min(1), Validators.max(65535)]],
    user: ['', Validators.required],
    password: ['', Validators.required],
    database: ['', Validators.required],
  });

  statusDisplay = computed(() => {
    const status = this.databaseService.status();
    switch (status) {
        case 'connected':
            return {
                text: 'Connected',
                color: 'text-green-500 dark:text-green-400',
                bgColor: 'bg-green-500/10',
                icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
            };
        case 'disconnected':
            return {
                text: 'Disconnected',
                color: 'text-red-500 dark:text-red-400',
                bgColor: 'bg-red-500/10',
                icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
            };
        case 'connecting':
            return {
                text: 'Connecting...',
                color: 'text-yellow-500 dark:text-yellow-400',
                bgColor: 'bg-yellow-500/10',
                icon: 'spinner'
            };
        case 'unknown':
        default:
            return {
                text: 'Not Verified',
                color: 'text-gray-500 dark:text-gray-400',
                bgColor: 'bg-gray-500/10',
                icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-1 1v1a1 1 0 102 0V8a1 1 0 00-1-1zM9 12a1 1 0 001 1h.01a1 1 0 100-2H10a1 1 0 00-1 1z'
            };
    }
  });

  constructor() {
    this.dbSettingsForm.get('dbType')?.valueChanges.subscribe(type => {
      if (type === 'aws') {
        this.dbSettingsForm.patchValue(this.awsDefaults, { emitEvent: false });
      } else {
        this.dbSettingsForm.patchValue(this.localDefaults, { emitEvent: false });
      }
    });

    this.dbSettingsForm.valueChanges.subscribe(() => {
        // When form values change, invalidate the previous connection test
        if (this.databaseService.status() !== 'connecting') {
            this.isConnectionVerified.set(false);
            this.databaseService.status.set('unknown');
            this.connectionTestMessage.set(null);
        }
    });
  }

  showAddForm(): void {
    this.editingConnection.set(null);
    this.dbSettingsForm.reset({
      id: '',
      name: 'New Connection',
      dbType: 'local',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'admin',
      database: 'etp_dashboard',
    });
    this.isConnectionVerified.set(false);
    this.databaseService.status.set('unknown');
    this.viewMode.set('form');
  }

  showEditForm(connection: DatabaseSettings): void {
    this.editingConnection.set(connection);
    this.dbSettingsForm.patchValue(connection);
    this.isConnectionVerified.set(false); // Require re-test after edit
    this.databaseService.status.set('unknown');
    this.viewMode.set('form');
  }

  cancelEdit(): void {
    this.editingConnection.set(null);
    this.dbSettingsForm.reset();
    this.viewMode.set('list');
  }

  confirmDelete(id: string, name: string): void {
    if (confirm(`Are you sure you want to delete the connection "${name}"?`)) {
      this.databaseService.deleteConnection(id);
      this.notificationService.addNotification(`Connection "${name}" deleted.`, 'success');
    }
  }

  onSave(): void {
    if (this.dbSettingsForm.invalid) {
      this.dbSettingsForm.markAllAsTouched();
      this.notificationService.addNotification('The form has invalid data.', 'error');
      return;
    }
    if (!this.isConnectionVerified()) {
        this.notificationService.addNotification('Please test the connection successfully before saving.', 'warning');
        return;
    }

    const formValue = this.dbSettingsForm.getRawValue();
    
    if (formValue.id) { // It has an ID, so it's an update
      this.databaseService.updateConnection(formValue as DatabaseSettings);
      this.notificationService.addNotification(`Connection "${formValue.name}" updated successfully.`, 'success');
    } else { // No ID, it's a new connection
      const { id, ...newConnData } = formValue;
      this.databaseService.addConnection(newConnData as Omit<DatabaseSettings, 'id'>);
      this.notificationService.addNotification(`Connection "${formValue.name}" added successfully.`, 'success');
    }
    
    this.viewMode.set('list');
  }

  async onTestConnection(): Promise<void> {
    if (this.dbSettingsForm.invalid) {
      this.dbSettingsForm.markAllAsTouched();
      return;
    }
    this.isConnectionVerified.set(false);
    this.connectionTestMessage.set(null);
    this.dbSettingsForm.disable(); // Disable form during test

    try {
      const settings = this.dbSettingsForm.getRawValue();
      const result = await this.databaseService.testConnection(settings);
      this.isConnectionVerified.set(result.success);
      this.connectionTestMessage.set(result.message);
    } finally {
        this.dbSettingsForm.enable(); // Re-enable form after test
    }
  }
}