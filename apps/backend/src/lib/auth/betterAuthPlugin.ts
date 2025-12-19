import { Elysia } from 'elysia';
import { auth } from './index';

export const betterAuthPlugin = new Elysia({ name: 'better-auth' }).mount(auth.handler);
