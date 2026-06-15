const BRAND = '#7c3aed';
const BRAND_LIGHT = '#f3f0ff';

export function verificationEmailTemplate(opts: {
  username: string;
  code: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: 'Verifica tu email — ShopSphere SQL',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:${BRAND};padding:28px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;">ShopSphere <span style="opacity:.85;">SQL</span></span>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 6px;color:#111;font-size:18px;font-weight:600;">Hola, ${opts.username}!</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">Tu código de verificación de email es:</p>
      <div style="background:${BRAND_LIGHT};border:2px solid ${BRAND};border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:${BRAND};font-family:monospace;">${opts.code}</span>
      </div>
      <p style="margin:0 0 6px;color:#777;font-size:13px;">Este código expira en <strong>15 minutos</strong>.</p>
      <p style="margin:0;color:#777;font-size:13px;">Si no creaste una cuenta en ShopSphere SQL, ignora este email.</p>
    </div>
    <div style="padding:18px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;color:#bbb;font-size:12px;">ShopSphere SQL Course · Datos de prueba</p>
    </div>
  </div>
</body></html>`,
    text: `Hola ${opts.username}!\n\nTu código de verificación de ShopSphere SQL es:\n\n  ${opts.code}\n\nEste código expira en 15 minutos.\n\nSi no creaste una cuenta, ignora este email.`,
  };
}

export function passwordResetEmailTemplate(opts: {
  code: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: 'Código para restablecer tu contraseña — ShopSphere SQL',
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:${BRAND};padding:28px;text-align:center;">
      <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px;">ShopSphere <span style="opacity:.85;">SQL</span></span>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 6px;color:#111;font-size:18px;font-weight:600;">Restablece tu contraseña</p>
      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.5;">Ingresa este código para crear una nueva contraseña:</p>
      <div style="background:#fff7ed;border:2px solid #f97316;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:38px;font-weight:700;letter-spacing:10px;color:#ea580c;font-family:monospace;">${opts.code}</span>
      </div>
      <p style="margin:0 0 6px;color:#777;font-size:13px;">Este código expira en <strong>15 minutos</strong>.</p>
      <p style="margin:0;color:#777;font-size:13px;">Si no solicitaste restablecer tu contraseña, ignora este email. Tu cuenta está segura.</p>
    </div>
    <div style="padding:18px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;color:#bbb;font-size:12px;">ShopSphere SQL Course · Datos de prueba</p>
    </div>
  </div>
</body></html>`,
    text: `Restablecimiento de contraseña — ShopSphere SQL\n\nTu código es:\n\n  ${opts.code}\n\nEste código expira en 15 minutos.\n\nSi no solicitaste esto, ignora este email. Tu cuenta está segura.`,
  };
}
