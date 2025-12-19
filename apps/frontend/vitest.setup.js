// import '@testing-library/jest-dom';
// import { vi } from 'vitest';

// // Mock complet du module authClient.jsx
// vi.mock('./src/lib/authClient.jsx', async () => {
//   const actual = await vi.importActual('./src/lib/authClient.jsx');

//   return {
//     ...actual,
//     authClient: {
//       signUp: {
//         email: vi.fn().mockResolvedValue({
//           data: { user: { email: 'testuser@example.com' } },
//           error: null,
//         }),
//       },
//       signIn: {
//         email: vi.fn().mockResolvedValue({
//           data: { user: { email: 'testuser@example.com' } },
//           error: null,
//         }),
//       },
//       sendVerificationEmail: vi.fn().mockResolvedValue({
//         error: null,
//       }),
//       useSession: vi.fn().mockReturnValue({
//         data: {
//           user: { email: 'testuser@example.com', role: 'user', emailVerified: true },
//           expires: new Date(Date.now() + 3600 * 1000).toISOString(),
//         },
//         isPending: false,
//         error: null,
//         refetch: vi.fn(),
//       }),
//       signOut: vi.fn().mockResolvedValue({ error: null }),
//     },
//   };
// });
