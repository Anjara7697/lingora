export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export interface Profile {
  avatar_url: string | null;
  birth_date: string | null;
  country: string | null;
  city: string | null;
  native_language: string | null;
  timezone: string | null;
  bio: string | null;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: Role;
  status: string;
  created_at: string;
  profile: Profile | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

export interface Envelope<T> {
  data: T | null;
  meta: Record<string, unknown>;
  error: ApiErrorBody | null;
}
