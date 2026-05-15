import { useState } from 'react';
import { Mail, Lock, User, Loader2, X, Eye, EyeOff } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

// ─────────────────────────────────────────────
// Composant Principal
// ─────────────────────────────────────────────

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success('Connexion réussie !');
      } else {
        await signUp(email, password, name);
        toast.success('Compte créé avec succès !');
      }
      onClose();
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-overlay/60 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed inset-x-4 top-1/2 max-w-sm mx-auto z-50"
                initial={{ opacity: 0, y: '-48%', scale: 0.96 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-48%', scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-strong rounded-2xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="relative px-6 pt-6 pb-4">
                    <Dialog.Close
                      className={cn(
                        'absolute top-4 right-4 p-2 rounded-full cursor-pointer',
                        'text-foreground/40 hover:text-foreground hover:bg-foreground/10',
                        'transition-all duration-200'
                      )}
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5" />
                    </Dialog.Close>

                    <div className="text-center">
                      <Dialog.Title className="text-xl font-medium text-foreground mb-1">
                        {mode === 'signin' ? 'Bon retour' : 'Créer un compte'}
                      </Dialog.Title>
                      <Dialog.Description className="text-sm text-foreground/50">
                        {mode === 'signin'
                          ? 'Connectez-vous pour retrouver vos morceaux'
                          : 'Inscrivez-vous pour sauvegarder vos likes'}
                      </Dialog.Description>
                    </div>
                  </div>

                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      void handleSubmit(e);
                    }}
                    className="px-6 pb-6 space-y-4"
                  >
                    {mode === 'signup' && (
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                        <input
                          type="text"
                          placeholder="Nom"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className={cn(
                            'w-full pl-11 pr-4 py-3 rounded-xl',
                            'bg-foreground/5 border border-foreground/10',
                            'text-foreground placeholder:text-foreground/50',
                            'focus:outline-none focus:border-foreground/20 focus:bg-foreground/10',
                            'transition-all duration-200'
                          )}
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={cn(
                          'w-full pl-11 pr-4 py-3 rounded-xl',
                          'bg-foreground/5 border border-foreground/10',
                          'text-foreground placeholder:text-foreground/50',
                          'focus:outline-none focus:border-foreground/20 focus:bg-foreground/10',
                          'transition-all duration-200'
                        )}
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className={cn(
                          'w-full pl-11 pr-11 py-3 rounded-xl',
                          'bg-foreground/5 border border-foreground/10',
                          'text-foreground placeholder:text-foreground/50',
                          'focus:outline-none focus:border-foreground/20 focus:bg-foreground/10',
                          'transition-all duration-200'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer"
                        aria-label={
                          showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                        }
                        aria-pressed={showPassword}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={cn(
                        'w-full py-3 rounded-xl font-medium',
                        'bg-foreground/10 hover:bg-foreground/15 border border-foreground/10',
                        'text-foreground transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'flex items-center justify-center gap-2'
                      )}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Chargement...
                        </>
                      ) : mode === 'signin' ? (
                        'Se connecter'
                      ) : (
                        "S'inscrire"
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={switchMode}
                        className="text-sm text-foreground/50 hover:text-foreground transition-all duration-200"
                      >
                        {mode === 'signin' ? (
                          <>
                            Pas encore de compte ?{' '}
                            <span className="text-foreground/70 hover:text-foreground">
                              S&apos;inscrire
                            </span>
                          </>
                        ) : (
                          <>
                            Déjà un compte ?{' '}
                            <span className="text-foreground/70 hover:text-foreground">
                              Se connecter
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
