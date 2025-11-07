import { Injectable, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
  phone: string;
  signupDate: string;
  password?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly storageKey = 'etp_dashboard_users';
  users = signal<User[]>([]);

  constructor() {
    this.loadUsersFromStorage();
  }

  private loadUsersFromStorage() {
    const storedUsers = localStorage.getItem(this.storageKey);
    if (storedUsers) {
      this.users.set(JSON.parse(storedUsers));
    }
  }

  private saveUsersToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.users()));
  }

  addUser(user: Omit<User, 'signupDate'>): void {
    const newUser: User = {
      ...user,
      signupDate: new Date().toISOString(),
    };
    this.users.update(currentUsers => [...currentUsers, newUser]);
    this.saveUsersToStorage();
  }

  updateUser(email: string, updatedDetails: { name: string, phone: string }): void {
    this.users.update(currentUsers => {
      const userIndex = currentUsers.findIndex(u => u.email === email);
      if (userIndex > -1) {
        currentUsers[userIndex] = {
          ...currentUsers[userIndex],
          name: updatedDetails.name,
          phone: updatedDetails.phone,
        };
      }
      return [...currentUsers];
    });
    this.saveUsersToStorage();
  }

  getUsers(): User[] {
    return this.users();
  }
}
