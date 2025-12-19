import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ModalWrapper } from './ui/modal-wrapper';
import { authClient } from '../lib/authClient';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

export interface ResetPasswordModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordResponse {
  error?: {
    message?: string;
  };
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onRequestClose }) => {
  const [form, setForm] = useState<ResetPasswordForm>({ password: '', confirmPassword: '' });
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('resetToken');

  useEffect(() => {
    if (!isOpen) {
      setForm({ password: '', confirmPassword: '' });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      const res = await authClient.resetPassword({
        token: resetToken ?? undefined,
        newPassword: form.password,
      }) as ResetPasswordResponse;

      if (res.error) {
        toast.error(res.error.message ?? 'Erreur lors de la réinitialisation');
        return;
      }

      toast.success('Mot de passe réinitialisé avec succès !');
      onRequestClose();
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[ResetPasswordModal → handleSubmit]', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inattendue';
      toast.error(errorMessage);
    }
  };

  if (!resetToken) {
    return null;
  }

  return (
    <ModalWrapper isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-2xl font-semibold mb-4 text-center">🔒 Réinitialiser le mot de passe</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Nouveau mot de passe</label>
          <Input
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Confirmez le mot de passe</label>
          <Input
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <Button type="submit" className="w-full" variant="default">
          Réinitialiser le mot de passe
        </Button>
      </form>
    </ModalWrapper>
  );
};

export default ResetPasswordModal;
