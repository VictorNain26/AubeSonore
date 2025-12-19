import { sendMail } from '@/services/mailerService.js';
import { env } from '@/config/env.js';

const testEmail = 'victor.lenain26@gmail.com';

async function testVerificationEmail(): Promise<void> {
  const testToken = 'test-verification-token';
  const testLink = `${env.FRONTEND_BASE_URL}/verify?token=${testToken}`;

  console.log('Test: Envoi de l email de verification...');
  await sendMail({
    to: testEmail,
    subject: 'Test OurMusic - Verification d email',
    variables: {
      preheader: 'Ceci est un test pour la verification d email OurMusic',
      isVerificationEmail: true,
      buttonLink: testLink,
      buttonText: 'Verifier mon email',
    },
  });
  console.log('Email de verification envoye avec succes.');
}

async function testResetPasswordEmail(): Promise<void> {
  const testToken = 'test-reset-token';
  const testLink = `${env.FRONTEND_BASE_URL}/reset-password?token=${testToken}`;

  console.log('Test: Envoi de l email de reinitialisation du mot de passe...');
  await sendMail({
    to: testEmail,
    subject: 'Test OurMusic - Reinitialisation de mot de passe',
    variables: {
      preheader: 'Ceci est un test pour la reinitialisation de mot de passe OurMusic',
      isResetPassword: true,
      buttonLink: testLink,
      buttonText: 'Reinitialiser mon mot de passe',
    },
  });
  console.log('Email de reinitialisation envoye avec succes.');
}

(async (): Promise<void> => {
  try {
    await testVerificationEmail();
    await testResetPasswordEmail();
    console.log('Tous les tests d email ont ete executes avec succes.');
    process.exit(0);
  } catch (error: unknown) {
    console.error('Erreur lors des tests d email :', error);
    process.exit(1);
  }
})();
