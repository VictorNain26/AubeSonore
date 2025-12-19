import { Elysia } from 'elysia';
import { auth } from './index';

interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    [key: string]: any;
  };
  session: {
    id: string;
    [key: string]: any;
  };
}

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
  auth: {
    async resolve({ error, request }: any): Promise<AuthSession | any> {
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
