import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ModalWrapper } from './ui/modal-wrapper';
import { authClient } from '../lib/authClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export interface RegisterModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

interface RegisterForm {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  error?: {
    message?: string;
  };
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onRequestClose }) => {
  const [form, setForm] = useState<RegisterForm>({ username: '', email: '', password: '' });
  const [successMsg, setSuccessMsg] = useState<string>('');
  const { signUp } = authClient;
  const { refetch } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setForm({ username: '', email: '', password: '' });
      setSuccessMsg('');
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const res = await signUp.email({
      email: form.email,
      password: form.password,
      name: form.username,
      callbackURL: `${window.location.origin}?email_verified=success`,
    }) as AuthResponse;

    if (res.error) {
      toast.error(res.error.message ?? 'Erreur à l\'inscription');
    } else {
      setSuccessMsg('✅ Compte créé ! Vérifiez votre email.');
      toast.success('🎉 Compte créé avec succès ! Vérifiez votre email.');
      onRequestClose();
      refetch();
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-2xl font-semibold mb-4 text-center">Créer un compte</h2>

      {successMsg && (
        <p className="text-green-600 mb-3 text-sm text-center">{successMsg}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Nom d'utilisateur</label>
          <Input
            name="username"
            placeholder="Nom d'utilisateur"
            value={form.username}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input
            name="email"
            type="email"
            placeholder="Adresse email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Mot de passe</label>
          <Input
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <Button type="submit" className="w-full" variant="default">
          S'inscrire
        </Button>
      </form>
    </ModalWrapper>
  );
};

export default RegisterModal;
