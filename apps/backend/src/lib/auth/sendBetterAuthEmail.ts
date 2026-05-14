import { sendMail } from '../../services/mailerService.js';
import { env } from '../../config/env';

interface SendBetterAuthEmailParams {
  to: string;
  subject: string;
  preheader: string;
  buttonLink: string;
  buttonText: string;
  isVerificationEmail?: boolean;
  isResetPassword?: boolean;
}

export async function sendBetterAuthEmail({
  to,
  subject,
  preheader,
  buttonLink,
  buttonText,
  isVerificationEmail = false,
  isResetPassword = false,
}: SendBetterAuthEmailParams): Promise<void> {
  if (env.DISABLE_EMAILS) {
    console.log(`📩 [sendBetterAuthEmail] (DEBUG MODE) Email NON envoyé à ${to}`);
    console.log('🧩 Détail (DEBUG) :', {
      subject,
      preheader,
      buttonLink,
      buttonText,
      isVerificationEmail,
      isResetPassword,
    });
    return;
  }

  try {
    await sendMail({
      to,
      subject,
      variables: {
        preheader,
        isVerificationEmail,
        isResetPassword,
        buttonLink,
        buttonText,
      },
    });

    console.log(`✅ [sendBetterAuthEmail] Email envoyé à ${to} — Sujet : "${subject}"`);
  } catch (error) {
    console.error('[BetterAuth Email Error]', error);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
