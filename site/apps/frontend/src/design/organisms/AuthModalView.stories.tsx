import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRef } from 'react';
import { AuthModalView } from './AuthModalView';

const noop = () => {};

const meta = {
  title: 'Organisms/AuthModal',
  component: AuthModalView,
  parameters: {
    docs: {
      description: {
        component:
          'Corps présentationnel de la modale d’authentification. Le conteneur `AuthModal` détient l’état, la validation et les appels Better Auth ; cette vue rend le markup selon le `mode`. Basculez le thème (barre d’outils **Thème**) pour vérifier chaque état en clair et sombre.',
      },
    },
  },
  argTypes: {
    mode: {
      control: 'inline-radio',
      options: ['signin', 'signup', 'forgot', 'reset-password', 'verification-sent'],
      description: 'Flux courant : titre, champs affichés et libellé du bouton en dépendent.',
    },
    isLoading: { control: 'boolean' },
    showPassword: { control: 'boolean' },
  },
  args: {
    mode: 'signin',
    isOpen: true,
    isLoading: false,
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    showPassword: false,
    pendingEmail: 'vous@exemple.fr',
    errors: {},
    emailRef: createRef<HTMLInputElement>(),
    passwordRef: createRef<HTMLInputElement>(),
    passwordConfirmRef: createRef<HTMLInputElement>(),
    onClose: noop,
    onSubmit: (e) => e.preventDefault(),
    onOAuthGoogle: noop,
    onToggleShowPassword: noop,
    onNameChange: noop,
    onEmailChange: noop,
    onEmailBlur: noop,
    onPasswordChange: noop,
    onPasswordBlur: noop,
    onPasswordConfirmChange: noop,
    onPasswordConfirmBlur: noop,
    onSwitchMode: noop,
  },
} satisfies Meta<typeof AuthModalView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Connexion: Story = {};

export const Inscription: Story = {
  args: { mode: 'signup', name: 'Jeanne Dupont', email: 'jeanne@exemple.fr' },
};

export const MotDePasseOublie: Story = {
  args: { mode: 'forgot', email: 'jeanne@exemple.fr' },
};

export const Chargement: Story = {
  args: { isLoading: true, email: 'jeanne@exemple.fr', password: 'password123' },
};

export const Erreur: Story = {
  parameters: {
    docs: { description: { story: 'Champs invalides avec messages d’erreur inline.' } },
  },
  args: {
    email: 'pas-un-email',
    password: '123',
    errors: {
      email: 'Adresse email invalide — vérifiez le format (vous@exemple.fr).',
      password: 'Le mot de passe doit contenir au moins 6 caractères.',
    },
  },
};

export const ReinitialisationMotDePasse: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Écran de définition d’un nouveau mot de passe après clic sur le lien reçu par email : champ de confirmation, flèche de retour et bouton « Réinitialiser ».',
      },
    },
  },
  args: { mode: 'reset-password', password: 'password123', passwordConfirm: 'password123' },
};

export const EmailEnvoye: Story = {
  parameters: {
    docs: { description: { story: 'Écran de confirmation après inscription.' } },
  },
  args: { mode: 'verification-sent' },
};
