/**
 * User model - consistent with database schema
 */
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session model
 */
export interface Session {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

/**
 * Account model (social auth)
 */
export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auth context for requests
 */
export interface AuthContext {
  user: User;
  session: Session;
}

/**
 * Public user info (for frontend display)
 */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  emailVerified: boolean;
  role: string;
}
