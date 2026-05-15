import { sendMail } from '../../services/mailerService.js';
import { env } from '../../config/env';
import { logger } from '../logger';

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
    logger.info('better_auth_email.skipped_debug_mode', {
      to,
      subject,
      buttonLink,
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

    logger.info('better_auth_email.sent', { to, subject });
  } catch (error) {
    logger.error('better_auth_email.failed', {
      to,
      subject,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof Error ? error : new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
