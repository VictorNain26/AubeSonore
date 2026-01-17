import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { htmlToText } from 'html-to-text';

interface MailVariables {
  [key: string]: string | boolean | undefined;
}

interface SendMailOptions {
  to: string;
  subject: string;
  variables?: MailVariables;
}

const htmlTemplate = readFileSync(
  resolve('src/services/templates/mailTemplate.html'),
  'utf-8',
);

function compileTemplate(template: string, variables: MailVariables = {}): string {
  return template
    .replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (_, condition, content) => {
      const value = variables[condition.trim()];
      return value ? content : '';
    })
    .replace(/{{(.*?)}}/g, (_, key) => String(variables[key.trim()] ?? ''));
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendMail({ to, subject, variables = {} }: SendMailOptions): Promise<void> {
  try {
    const html = compileTemplate(htmlTemplate, { subject, ...variables });
    const text = htmlToText(html, { wordwrap: 130 });

    const info = await transporter.sendMail({
      from: 'AubeSonore <noreply@aubesonore.fr>',
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email envoyé à ${to} — Sujet: "${subject}"`);
    console.log(`📧 Message ID: ${info.messageId}`);
  } catch (err: unknown) {
    console.error('[Mailer Error]', err);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
