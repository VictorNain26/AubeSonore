import { useState, useRef } from 'react';
import { Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import { toast } from 'sonner';
import { toastError } from '../lib/appToast';
import { Modal } from '../design/ui/Modal';
import { Button } from '../design/ui/Button';
import { TextField } from '../design/ui/TextField';

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

function validateEmailFormat(value: string): string | undefined {
  if (!value) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? undefined
    : 'Adresse email invalide — vérifiez le format (vous@exemple.fr).';
}

function validatePasswordLength(value: string): string | undefined {
  if (!value) return undefined;
  return value.length >= 6 ? undefined : 'Le mot de passe doit contenir au moins 6 caractères.';
}

function validatePasswordMatch(password: string, confirm: string): string | undefined {
  if (!confirm) return undefined;
  return confirm === password ? undefined : 'Les mots de passe ne correspondent pas.';
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

const TEXT_LINK_CLASSES =
  'inline-flex min-h-11 cursor-pointer items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80';

export function AuthModal({ isOpen, onClose, defaultMode = 'signin', resetToken }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(resetToken ? 'reset-password' : defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);

  const setFieldError = (field: string, message: string | undefined) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) {
        next[field] = message;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setName('');
    setShowPassword(false);
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    resetForm();
    setMode(defaultMode);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    let firstInvalidRef: React.RefObject<HTMLInputElement | null> | null = null;

    if (mode !== 'reset-password') {
      const emailError = validateEmailFormat(email);
      if (emailError) {
        nextErrors.email = emailError;
        firstInvalidRef ??= emailRef;
      }
    }

    if (mode !== 'forgot') {
      const passwordError = validatePasswordLength(password);
      if (passwordError) {
        nextErrors.password = passwordError;
        firstInvalidRef ??= passwordRef;
      }
    }

    if (mode === 'reset-password') {
      const confirmError = validatePasswordMatch(password, passwordConfirm);
      if (confirmError) {
        nextErrors.passwordConfirm = confirmError;
        firstInvalidRef ??= passwordConfirmRef;
      }
    }

    setErrors(nextErrors);
    if (firstInvalidRef) {
      firstInvalidRef.current?.focus();
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
        await authApi.resetPassword(resetToken, password);
        toast.success('Mot de passe mis à jour. Connectez-vous.');
        resetForm();
        setMode('signin');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Une erreur est survenue');
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
      toastError(err instanceof Error ? err.message : 'Connexion impossible');
      setIsLoading(false);
    }
  };

  const switchTo = (next: AuthMode) => {
    setMode(next);
    resetForm();
  };

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

  const passwordToggle = (
    <Button
      type="button"
      variant="icon"
      onClick={() => setShowPassword((s) => !s)}
      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      aria-pressed={showPassword}
    >
      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </Button>
  );

  return (
    <Modal
      title={headerCopy.title}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <p className="-mt-3 text-caption text-text-faint">{headerCopy.desc}</p>

      {(mode === 'forgot' || mode === 'reset-password') && (
        <Button
          type="button"
          variant="icon"
          aria-label="Retour à la connexion"
          onClick={() => switchTo('signin')}
          className="-mt-2"
        >
          <ArrowLeft className="size-5" />
        </Button>
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleOAuth('google')}
                disabled={isLoading}
                className="w-full justify-center gap-3 border border-border"
              >
                <GoogleLogo className="size-5" />
                Continuer avec Google
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 border-t border-border" />
                <span className="text-caption text-text-faint uppercase">ou</span>
                <div className="flex-1 border-t border-border" />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <TextField
              id="name"
              label="Nom"
              type="text"
              placeholder="Jeanne Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          {mode !== 'reset-password' && (
            <TextField
              id="email"
              ref={emailRef}
              label="Email"
              type="email"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setFieldError('email', validateEmailFormat(e.target.value));
              }}
              onBlur={() => setFieldError('email', validateEmailFormat(email))}
              required
              autoComplete="email"
              error={errors.email}
            />
          )}

          {mode !== 'forgot' && (
            <TextField
              id="password"
              ref={passwordRef}
              label={mode === 'reset-password' ? 'Nouveau mot de passe' : 'Mot de passe'}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setFieldError('password', validatePasswordLength(e.target.value));
                }
                if (errors.passwordConfirm) {
                  setFieldError(
                    'passwordConfirm',
                    validatePasswordMatch(e.target.value, passwordConfirm)
                  );
                }
              }}
              onBlur={() => setFieldError('password', validatePasswordLength(password))}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              error={errors.password}
              trailing={passwordToggle}
            />
          )}

          {mode === 'reset-password' && (
            <TextField
              id="password-confirm"
              ref={passwordConfirmRef}
              label="Confirmer le mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                if (errors.passwordConfirm) {
                  setFieldError('passwordConfirm', validatePasswordMatch(password, e.target.value));
                }
              }}
              onBlur={() =>
                setFieldError('passwordConfirm', validatePasswordMatch(password, passwordConfirm))
              }
              required
              minLength={6}
              autoComplete="new-password"
              error={errors.passwordConfirm}
            />
          )}

          {mode === 'signin' && (
            <div className="-mt-2 text-right">
              <button
                type="button"
                onClick={() => switchTo('forgot')}
                className={`${TEXT_LINK_CLASSES} text-caption text-accent hover:underline`}
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          <Button type="submit" loading={isLoading} className="w-full justify-center">
            {isLoading
              ? 'Chargement...'
              : mode === 'signin'
                ? 'Se connecter'
                : mode === 'signup'
                  ? "S'inscrire"
                  : mode === 'forgot'
                    ? 'Envoyer le lien'
                    : 'Réinitialiser'}
          </Button>

          {mode !== 'forgot' && mode !== 'reset-password' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => switchTo(mode === 'signin' ? 'signup' : 'signin')}
                className={`${TEXT_LINK_CLASSES} text-body text-text-muted`}
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
    </Modal>
  );
}

function VerificationSentBody({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-accent/20 bg-accent/10">
        <MailCheck className="size-7 text-accent" />
      </div>
      <p className="text-body text-text-muted">
        Un email a été envoyé à <span className="font-medium break-all text-text">{email}</span>.
        Cliquez sur le lien pour activer votre compte.
      </p>
      <p className="text-caption text-text-faint">
        Pas reçu ? Vérifiez vos spams. Le lien expire dans 24 h.
      </p>
      <Button
        variant="ghost"
        onClick={onClose}
        className="w-full justify-center border border-border"
      >
        J&apos;ai compris
      </Button>
    </div>
  );
}
