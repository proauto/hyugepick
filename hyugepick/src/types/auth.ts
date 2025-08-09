export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}