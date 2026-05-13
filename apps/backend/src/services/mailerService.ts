import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { htmlToText } from 'html-to-text';
import { env } from '../config/env';

interface MailVariables {
  [key: string]: string | boolean | undefined;
}

interface SendMailOptions {
  to: string;
  subject: string;
  variables?: MailVariables;
}

const isProd: boolean = process.env.NODE_ENV === 'production' || process.env.ENV === 'production';

const htmlTemplate = readFileSync(resolve('src/services/templates/mailTemplate.html'), 'utf-8');

function compileTemplate(template: string, variables: MailVariables = {}): string {
  return template
    .replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
      const value = variables[condition.trim()];
      return value ? content : '';
    })
    .replace(/{{(.*?)}}/g, (_, key) => String(variables[key.trim()] ?? ''));
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // implicit TLS on 465
  requireTLS: isProd && env.SMTP_PORT !== 465, // STARTTLS on 587 in prod
  auth: env.SMTP_USER
    ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      }
    : undefined,
});

export async function sendMail({ to, subject, variables = {} }: SendMailOptions): Promise<void> {
  try {
    const html = compileTemplate(htmlTemplate, { subject, ...variables });
    const text = htmlToText(html, { wordwrap: 130 });

    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    });

    console.log(`[Mailer] sent message-id=${info.messageId}`);
  } catch (err: unknown) {
    console.error('[Mailer] send failed:', (err as Error).message);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
