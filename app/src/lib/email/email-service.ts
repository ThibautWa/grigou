import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL pour le port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
    console.log('📧 Envoi email à:', to, 'sujet:', subject);
    console.log('SMTP Config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,

    });
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'Grigou'}" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, ''),
        });
        console.log('✅ Email envoyé:', info.messageId, 'to:', to);
        return true;
    } catch (error) {
        console.error('Erreur envoi email:', error);
        return false;
    }
}

export async function sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;

    const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Grigou</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px;">
          <h2 style="color: #1f2937; margin-top: 0;">Réinitialisation de votre mot de passe</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Bonjour <strong>${firstName}</strong>,
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe. 
            Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, 
            ignorez simplement cet email — votre mot de passe restera inchangé.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Grigou — Gestionnaire de budget personnel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
Bonjour ${firstName},

Vous avez demandé la réinitialisation de votre mot de passe sur Grigou.

Cliquez sur ce lien pour réinitialiser votre mot de passe :
${resetUrl}

Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.

— Grigou
  `.trim();

    return sendEmail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe — Grigou',
        html,
        text,
    });
}