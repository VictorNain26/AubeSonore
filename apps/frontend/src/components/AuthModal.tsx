import { useState } from 'react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

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
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto z-50">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-1">
                {mode === 'signin' ? 'Bon retour !' : 'Créer un compte'}
              </h2>
              <p className="text-sm text-white/60">
                {mode === 'signin'
                  ? 'Connectez-vous pour retrouver vos morceaux'
                  : 'Inscrivez-vous pour sauvegarder vos likes'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {mode === 'signup' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={cn(
                    'w-full pl-11 pr-4 py-3 rounded-xl',
                    'bg-white/5 border border-white/10',
                    'text-white placeholder:text-white/40',
                    'focus:outline-none focus:border-purple-500/50 focus:bg-white/10',
                    'transition-all'
                  )}
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  'w-full pl-11 pr-4 py-3 rounded-xl',
                  'bg-white/5 border border-white/10',
                  'text-white placeholder:text-white/40',
                  'focus:outline-none focus:border-purple-500/50 focus:bg-white/10',
                  'transition-all'
                )}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={cn(
                  'w-full pl-11 pr-4 py-3 rounded-xl',
                  'bg-white/5 border border-white/10',
                  'text-white placeholder:text-white/40',
                  'focus:outline-none focus:border-purple-500/50 focus:bg-white/10',
                  'transition-all'
                )}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-xl font-medium transition-all',
                'bg-gradient-to-r from-purple-600 to-purple-500',
                'hover:from-purple-500 hover:to-purple-400',
                'text-white shadow-lg shadow-purple-500/25',
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
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {mode === 'signin' ? (
                  <>
                    Pas encore de compte ?{' '}
                    <span className="text-purple-400 hover:text-purple-300">S'inscrire</span>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{' '}
                    <span className="text-purple-400 hover:text-purple-300">Se connecter</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
