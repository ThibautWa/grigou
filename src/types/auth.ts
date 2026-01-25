// types/auth.ts

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  isActive: boolean;
}

export interface UserCreateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserLoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Validation schemas
export interface ValidationError {
  field: string;
  message: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

// Étendre les types NextAuth
declare module "next-auth" {
  interface Session {
    user: SessionUser;
    accessToken: string;
  }

  interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: number;
    email: string;
    firstName: string;
    lastName: string;
  }
}
