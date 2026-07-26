import type { RefObject } from 'react';
import { Eye, EyeOff, MailCheck, ArrowLeft } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';
import { TextField } from '../atoms/TextField';
import * as m from '@/paraglide/messages.js';

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'verification-sent' | 'reset-password';

export interface AuthModalViewProps {
  /** Flux courant : détermine titre, champs affichés et libellé du bouton. */
  mode: AuthMode;
  /** Ouverture de la modale (portail Base UI). */
  isOpen: boolean;
  /** Désactive les actions et affiche le spinner du bouton de soumission. */
  isLoading: boolean;
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  /** Bascule les champs mot de passe entre `text` et `password`. */
  showPassword: boolean;
  /** Email affiché sur l'écran de confirmation d'inscription. */
  pendingEmail: string;
  /** Erreurs de validation par champ (`email`, `password`, `passwordConfirm`). */
  errors: Record<string, string>;
  emailRef: RefObject<HTMLInputElement | null>;
  passwordRef: RefObject<HTMLInputElement | null>;
  passwordConfirmRef: RefObject<HTMLInputElement | null>;
  /** Fermeture (croix, overlay, bouton « J'ai compris »). */
  onClose: () => void;
  /** Soumission du formulaire (le conteneur gère `preventDefault`). */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Connexion OAuth Google. */
  onOAuthGoogle: () => void;
  onToggleShowPassword: () => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onEmailBlur: () => void;
  onPasswordChange: (value: string) => void;
  onPasswordBlur: () => void;
  onPasswordConfirmChange: (value: string) => void;
  onPasswordConfirmBlur: () => void;
  /** Change de flux (bascule connexion/inscription, mot de passe oublié, retour). */
  onSwitchMode: (next: AuthMode) => void;
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

/**
 * Corps présentationnel de la modale d'authentification : en-tête, boutons
 * OAuth, formulaire (champs selon le flux) et écran de confirmation d'email.
 * Le conteneur `AuthModal` détient l'état, la validation et tous les appels
 * Better Auth ; cette vue ne fait que rendre le markup et remonter les
 * événements.
 */
export function AuthModalView({
  mode,
  isOpen,
  isLoading,
  email,
  password,
  passwordConfirm,
  name,
  showPassword,
  pendingEmail,
  errors,
  emailRef,
  passwordRef,
  passwordConfirmRef,
  onClose,
  onSubmit,
  onOAuthGoogle,
  onToggleShowPassword,
  onNameChange,
  onEmailChange,
  onEmailBlur,
  onPasswordChange,
  onPasswordBlur,
  onPasswordConfirmChange,
  onPasswordConfirmBlur,
  onSwitchMode,
}: AuthModalViewProps) {
  const headerCopy = {
    signin: { title: m.auth_signin_title(), desc: m.auth_signin_desc() },
    signup: { title: m.auth_signup_title(), desc: m.auth_signup_desc() },
    forgot: { title: m.auth_forgot_title(), desc: m.auth_forgot_desc() },
    'verification-sent': {
      title: m.auth_verification_title(),
      desc: m.auth_verification_desc(),
    },
    'reset-password': { title: m.auth_new_password(), desc: m.auth_reset_desc() },
  }[mode];

  const passwordToggle = (
    <Button
      type="button"
      variant="icon"
      onClick={onToggleShowPassword}
      aria-label={showPassword ? m.auth_password_hide() : m.auth_password_show()}
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
        if (!open) onClose();
      }}
    >
      <p className="text-caption text-text-faint -mt-3">{headerCopy.desc}</p>

      {(mode === 'forgot' || mode === 'reset-password') && (
        <Button
          type="button"
          variant="icon"
          aria-label={m.auth_back_to_signin()}
          onClick={() => onSwitchMode('signin')}
          className="-mt-2"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}

      {mode === 'verification-sent' ? (
        <VerificationSentBody email={pendingEmail} onClose={onClose} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {mode !== 'forgot' && mode !== 'reset-password' && (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onOAuthGoogle}
                disabled={isLoading}
                className="border-border w-full justify-center gap-3 border"
              >
                <GoogleLogo className="size-5" />
                {m.auth_oauth_google()}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="border-border flex-1 border-t" />
                <span className="text-caption text-text-faint uppercase">{m.auth_or()}</span>
                <div className="border-border flex-1 border-t" />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <TextField
              id="name"
              label={m.auth_name_label()}
              type="text"
              placeholder={m.auth_name_placeholder()}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
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
              placeholder={m.auth_email_placeholder()}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onBlur={onEmailBlur}
              required
              autoComplete="email"
              error={errors.email}
            />
          )}

          {mode !== 'forgot' && (
            <TextField
              id="password"
              ref={passwordRef}
              label={mode === 'reset-password' ? m.auth_new_password() : m.auth_password_label()}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onBlur={onPasswordBlur}
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
              label={m.auth_password_confirm_label()}
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => onPasswordConfirmChange(e.target.value)}
              onBlur={onPasswordConfirmBlur}
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
                onClick={() => onSwitchMode('forgot')}
                className={`${TEXT_LINK_CLASSES} text-caption text-accent hover:underline`}
              >
                {m.auth_forgot_link()}
              </button>
            </div>
          )}

          <Button type="submit" loading={isLoading} className="w-full justify-center">
            {isLoading
              ? m.auth_loading()
              : mode === 'signin'
                ? m.auth_submit_signin()
                : mode === 'signup'
                  ? m.auth_submit_signup()
                  : mode === 'forgot'
                    ? m.auth_submit_forgot()
                    : m.auth_submit_reset()}
          </Button>

          {mode !== 'forgot' && mode !== 'reset-password' && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onSwitchMode(mode === 'signin' ? 'signup' : 'signin')}
                className={`${TEXT_LINK_CLASSES} text-body text-text-muted`}
              >
                {mode === 'signin' ? (
                  <>
                    {m.auth_no_account()}{' '}
                    <span className="text-accent hover:underline">{m.auth_submit_signup()}</span>
                  </>
                ) : (
                  <>
                    {m.auth_have_account()}{' '}
                    <span className="text-accent hover:underline">{m.auth_submit_signin()}</span>
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
      <div className="border-accent/20 bg-accent/10 mx-auto flex size-14 items-center justify-center rounded-full border">
        <MailCheck className="text-accent size-7" />
      </div>
      <p className="text-body text-text-muted">
        {m.auth_verification_sent_to()}{' '}
        <span className="text-text font-medium break-all">{email}</span>.{' '}
        {m.auth_verification_click_link()}
      </p>
      <p className="text-caption text-text-faint">{m.auth_verification_spam_hint()}</p>
      <Button
        variant="ghost"
        onClick={onClose}
        className="border-border w-full justify-center border"
      >
        {m.auth_verification_dismiss()}
      </Button>
    </div>
  );
}
