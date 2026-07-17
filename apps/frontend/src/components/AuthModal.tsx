import { useState } from 'react';
import { Mail, Lock, User, Loader2, Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import { toast } from 'sonner';
import { ModalShell } from './ui/ModalShell';
import { Button, IconButton } from './ui/Button';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verification-sent' | 'reset-password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  // When the user lands from a forgot-password email link, the URL contains
  // a token. Layout extracts it and passes it down to switch the modal into
  // the reset flow on mount.
  resetToken?: string;
}

// ─────────────────────────────────────────────
// Brand SVGs — official logos kept inline so we don't import a logo lib
// ─────────────────────────────────────────────

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.87 0-5.3-1.94-6.16-4.55H2.18v2.85A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.08A6.6 6.6 0 0 1 5.5 12c0-.72.12-1.42.34-2.08V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.85Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.85C6.7 7.32 9.13 5.38 12 5.38Z"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function AuthModal({ isOpen, onClose, defaultMode = 'signin', resetToken }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(resetToken ? 'reset-password' : defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setName('');
    setShowPassword(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setMode(defaultMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success('Connexion réussie !');
        handleClose();
      } else if (mode === 'signup') {
        await signUp(email, password, name);
        // requireEmailVerification: true on the backend → show the verify
        // screen instead of toasting + closing. The session is created but
        // login won't fully work until the email is confirmed.
        setPendingEmail(email);
        resetForm();
        setMode('verification-sent');
      } else if (mode === 'forgot') {
        await authApi.forgetPassword(email);
        toast.success('Si un compte existe, un email vient d’être envoyé.');
        setMode('signin');
      } else if (mode === 'reset-password' && resetToken) {
        if (password !== passwordConfirm) {
          toast.error('Les mots de passe ne correspondent pas');
          setIsLoading(false);
          return;
        }
        await authApi.resetPassword(resetToken, password);
        toast.success('Mot de passe mis à jour. Connectez-vous.');
        resetForm();
        setMode('signin');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setIsLoading(true);
    try {
      await authApi.signInWithProvider(provider);
      // On success the browser navigates to the provider; keep loading state.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible');
      setIsLoading(false);
    }
  };

  const switchTo = (next: AuthMode) => {
    setMode(next);
    resetForm();
  };

  // ── Title + description per mode ────────────────────────────────────────
  const headerCopy = {
    signin: { title: 'Bon retour', desc: 'Connectez-vous pour retrouver vos découvertes' },
    signup: {
      title: 'Créer un compte',
      desc: 'Inscrivez-vous pour ne plus perdre vos découvertes',
    },
    forgot: { title: 'Mot de passe oublié', desc: 'On vous envoie un lien de réinitialisation' },
    'verification-sent': {
      title: 'Vérifiez votre boîte mail',
      desc: 'Un email de confirmation vient d’être envoyé',
    },
    'reset-password': {
      title: 'Nouveau mot de passe',
      desc: 'Choisissez un mot de passe d’au moins 6 caractères',
    },
  }[mode];

  const oauthButtonClass = cn(
    'w-full flex items-center justify-center gap-3 py-2.5 rounded-md',
    'border border-line text-ink hover:bg-paper-raised',
    'text-body font-medium transition-colors cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const inputClass = cn(
    'w-full pl-11 pr-4 py-2 rounded-md border border-line bg-paper',
    'text-body text-ink placeholder:text-ink-faint',
    'focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent',
    'transition-colors'
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title={headerCopy.title}
      description={headerCopy.desc}
    >
      {mode === 'forgot' && (
        <IconButton
          shape="round"
          label="Retour à la connexion"
          onClick={() => switchTo('signin')}
          className="-mt-2 mb-2"
        >
          <ArrowLeft />
        </IconButton>
      )}

      {mode === 'verification-sent' ? (
        <VerificationSentBody email={pendingEmail} onClose={handleClose} />
      ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-4"
        >
          {mode !== 'forgot' && mode !== 'reset-password' && (
            <>
              {/* OAuth */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void handleOAuth('google')}
                  disabled={isLoading}
                  className={oauthButtonClass}
                >
                  <GoogleLogo className="w-5 h-5" />
                  Continuer avec Google
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-line" />
                <span className="text-caption text-ink-faint uppercase tracking-wider">ou</span>
                <div className="flex-1 h-px bg-line" />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
              <input
                type="text"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className={inputClass}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'reset-password' ? 'Nouveau mot de passe' : 'Mot de passe'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className={cn(inputClass, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-ink-faint hover:text-ink transition-colors cursor-pointer"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {mode === 'reset-password' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmez le mot de passe"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
          )}

          {mode === 'signin' && (
            <div className="text-right -mt-2">
              <button
                type="button"
                onClick={() => switchTo('forgot')}
                className="text-caption text-accent hover:underline cursor-pointer"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <Button type="submit" variant="accent" disabled={isLoading} className="w-full py-2.5">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Chargement...
              </>
            ) : mode === 'signin' ? (
              'Se connecter'
            ) : mode === 'signup' ? (
              "S'inscrire"
            ) : mode === 'forgot' ? (
              'Envoyer le lien'
            ) : (
              'Réinitialiser'
            )}
          </Button>

          {mode !== 'forgot' && mode !== 'reset-password' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchTo(mode === 'signin' ? 'signup' : 'signin')}
                className="text-body text-ink-soft cursor-pointer"
              >
                {mode === 'signin' ? (
                  <>
                    Pas encore de compte ?{' '}
                    <span className="text-accent hover:underline">S&apos;inscrire</span>
                  </>
                ) : (
                  <>
                    Déjà un compte ?{' '}
                    <span className="text-accent hover:underline">Se connecter</span>
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────
// Sub-component: post-signup body
// ─────────────────────────────────────────────

function VerificationSentBody({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
        <MailCheck className="w-7 h-7 text-accent" />
      </div>
      <p className="text-body text-ink-soft">
        Un email a été envoyé à <span className="text-ink font-medium break-all">{email}</span>.
        Cliquez sur le lien pour activer votre compte.
      </p>
      <p className="text-caption text-ink-faint">
        Pas reçu ? Vérifiez vos spams. Le lien expire dans 24 h.
      </p>
      <Button variant="ink" onClick={onClose} className="w-full py-2.5">
        J&apos;ai compris
      </Button>
    </div>
  );
}
