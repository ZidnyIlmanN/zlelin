export interface UserProfile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  status?: 'online' | 'offline' | 'in_game';
  createdAt?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
}
