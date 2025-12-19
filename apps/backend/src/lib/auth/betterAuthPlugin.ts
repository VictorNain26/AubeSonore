import { Elysia } from 'elysia';
import { auth } from './index';

interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified?: boolean;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}

interface ResolveContext {
  error: (status: number) => void;
  request: {
    headers: Headers;
  };
}

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
  auth: {
    async resolve({ error, request }: ResolveContext): Promise<AuthSession> {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session) {
        return error(401);
      }

      return {
        user: session.user,
        session: session.session,
      };
    },
  },
});
