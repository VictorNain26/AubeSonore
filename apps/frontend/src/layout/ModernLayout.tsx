import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { authClient } from '../lib/authClient';
import Sidebar from '../components/Sidebar';
import ModernHeader from '../components/ModernHeader';
import { Loader2 } from 'lucide-react';

const LoginModal = lazy(() => import('../components/LoginModal'));
const RegisterModal = lazy(() => import('../components/RegisterModal'));
const ResetPasswordModal = lazy(() => import('../components/ResetPasswordModal'));

export interface ModernLayoutProps {
  children: React.ReactNode;
}

interface VerifyEmailResponse {
  error?: {
    message?: string;
  };
}

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background to-background/50">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-white/70 text-sm">Chargement...</p>
    </motion.div>
  </div>
);

const ModernLayout: React.FC<ModernLayoutProps> = ({ children }) => {
  const [isLoginOpen, setLoginOpen] = useState<boolean>(false);
  const [isRegisterOpen, setRegisterOpen] = useState<boolean>(false);
  const [isResetPasswordOpen, setResetPasswordOpen] = useState<boolean>(false);

  const { isLoading, refetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle email verification
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      return;
    }

    const verifyEmail = async (): Promise<void> => {
      try {
        const response = await authClient.verifyEmail({ query: { token } }) as VerifyEmailResponse;
        if (response.error) {
          throw new Error(response.error.message);
        }
        toast.success('Adresse email vérifiée avec succès.');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de vérification.';
        toast.error(errorMessage);
      } finally {
        await refetch();
        searchParams.delete('token');
        setSearchParams(searchParams, { replace: true });
      }
    };

    verifyEmail();
  }, [searchParams, setSearchParams, refetch]);

  // Handle reset password token
  useEffect(() => {
    const resetToken = searchParams.get('resetToken');
    if (resetToken) {
      setResetPasswordOpen(true);
    }
  }, [searchParams]);

  // Handle success notifications from URL params
  useEffect(() => {
    const emailVerified = searchParams.get('email_verified');
    const passwordReset = searchParams.get('password_reset');
    const spotifyLinked = searchParams.get('spotify_linked');

    if (emailVerified === 'success') {
      toast.success('Adresse email vérifiée.');
      searchParams.delete('email_verified');
      setSearchParams(searchParams, { replace: true });
    }

    if (passwordReset === 'success') {
      toast.success('Mot de passe réinitialisé.');
      searchParams.delete('password_reset');
      setSearchParams(searchParams, { replace: true });
    }

    if (spotifyLinked === 'success') {
      toast.success('Compte Spotify lié avec succès 🎧');
      refetch();
      searchParams.delete('spotify_linked');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetch]);

  // Modal handlers
  const handleLoginOpen = (): void => setLoginOpen(true);
  const handleRegisterOpen = (): void => setRegisterOpen(true);
  const handleLoginClose = (): void => setLoginOpen(false);
  const handleRegisterClose = (): void => setRegisterOpen(false);
  const handleResetPasswordClose = (): void => setResetPasswordOpen(false);

  // Show loading screen
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          className: 'bg-card/90 backdrop-blur-xl border border-white/10 text-white',
          iconTheme: {
            primary: 'hsl(271 81% 56%)',
            secondary: 'white',
          },
        }}
      />

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <ModernHeader
            onLogin={handleLoginOpen}
            onRegister={handleRegisterOpen}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key="layout-main"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        <LoginModal isOpen={isLoginOpen} onRequestClose={handleLoginClose} />
        <RegisterModal isOpen={isRegisterOpen} onRequestClose={handleRegisterClose} />
        <ResetPasswordModal isOpen={isResetPasswordOpen} onRequestClose={handleResetPasswordClose} />
      </Suspense>

      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        />
      </div>
    </div>
  );
};

export default ModernLayout;
