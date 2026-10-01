import { useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../lib/api';
import { toast } from 'sonner';
import { toastError } from '../lib/appToast';
import { AuthModalView, type AuthMode } from '../design/organisms/AuthModalView';
import * as m from '@/paraglide/messages.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  // Layout hands us a reset-password token when the URL carries
  // a token. Layout extracts it and passes it down to switch the modal into
  // the reset flow on mount.
  resetToken?: string;
}

function validateEmailFormat(value: string): string | undefined {
  if (!value) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : m.auth_error_email_invalid();
}

function validatePasswordLength(value: string): string | undefined {
  if (!value) return undefined;
  return value.length >= 6 ? undefined : m.auth_error_password_length();
}

function validatePasswordMatch(password: string, confirm: string): string | undefined {
  if (!confirm) return undefined;
  return confirm === password ? undefined : m.auth_error_password_mismatch();
}

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success(m.toast_signin_success());
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
        toast.success(m.toast_forgot_sent());
        setMode('signin');
      } else if (mode === 'reset-password' && resetToken) {
        await authApi.resetPassword(resetToken, password);
        toast.success(m.toast_password_reset());
        resetForm();
        setMode('signin');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : m.error_generic());
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
      toastError(err instanceof Error ? err.message : m.error_oauth_failed());
      setIsLoading(false);
    }
  };

  const switchTo = (next: AuthMode) => {
    setMode(next);
    resetForm();
  };

  return (
    <AuthModalView
      mode={mode}
      isOpen={isOpen}
      isLoading={isLoading}
      email={email}
      password={password}
      passwordConfirm={passwordConfirm}
      name={name}
      showPassword={showPassword}
      pendingEmail={pendingEmail}
      errors={errors}
      emailRef={emailRef}
      passwordRef={passwordRef}
      passwordConfirmRef={passwordConfirmRef}
      onClose={handleClose}
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      onOAuthGoogle={() => void handleOAuth('google')}
      onToggleShowPassword={() => setShowPassword((s) => !s)}
      onNameChange={(value) => setName(value)}
      onEmailChange={(value) => {
        setEmail(value);
        if (errors.email) setFieldError('email', validateEmailFormat(value));
      }}
      onEmailBlur={() => setFieldError('email', validateEmailFormat(email))}
      onPasswordChange={(value) => {
        setPassword(value);
        if (errors.password) {
          setFieldError('password', validatePasswordLength(value));
        }
        if (errors.passwordConfirm) {
          setFieldError('passwordConfirm', validatePasswordMatch(value, passwordConfirm));
        }
      }}
      onPasswordBlur={() => setFieldError('password', validatePasswordLength(password))}
      onPasswordConfirmChange={(value) => {
        setPasswordConfirm(value);
        if (errors.passwordConfirm) {
          setFieldError('passwordConfirm', validatePasswordMatch(password, value));
        }
      }}
      onPasswordConfirmBlur={() =>
        setFieldError('passwordConfirm', validatePasswordMatch(password, passwordConfirm))
      }
      onSwitchMode={switchTo}
    />
  );
}
