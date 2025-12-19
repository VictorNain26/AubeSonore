import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ModalWrapper } from './ui/modal-wrapper';
import { authClient } from '../lib/authClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export interface LoginModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
}

interface LoginForm {
  email: string;
  password: string;
}

interface AuthResponse {
  error?: {
    message?: string;
  };
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onRequestClose }) => {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const { signIn } = authClient;
  const { refetch } = useAuth();

  useEffect(() => {
    if (!isOpen) {
      setForm({ email: '', password: '' });
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const res = await signIn.email({
      email: form.email,
      password: form.password,
    }) as AuthResponse;

    if (res.error) {
      toast.error(res.error.message ?? 'Erreur de connexion');
    } else {
      toast.success('Bienvenue 🎉 Connexion réussie !');
      onRequestClose();
      refetch();
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onRequestClose={onRequestClose}>
      <h2 className="text-2xl font-semibold mb-4 text-center">Se connecter</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          Se connecter
        </Button>
      </form>
    </ModalWrapper>
  );
};

export default LoginModal;
