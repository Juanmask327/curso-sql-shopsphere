import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env['SMTP_HOST']) return null;
  if (_transporter) return _transporter;

  const port = parseInt(process.env['SMTP_PORT'] ?? '587', 10);

  _transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'],
    port,
    secure: port === 465,
    auth: process.env['SMTP_USER']
      ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] ?? '' }
      : undefined,
  });

  return _transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const FROM = process.env['SMTP_FROM'] ?? 'ShopSphere SQL <noreply@shopsphere.app>';

export async function sendMail(opts: MailOptions): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    // Development fallback: print to console so the code is visible without SMTP
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧  [DEV EMAIL — configura SMTP_HOST para enviar emails reales]');
    console.log(`    To:      ${opts.to}`);
    console.log(`    Subject: ${opts.subject}`);
    console.log('    ─────────────────────────────────────────────');
    opts.text.split('\n').forEach(line => console.log(`    ${line}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  }

  await transporter.sendMail({ from: FROM, ...opts });
}
