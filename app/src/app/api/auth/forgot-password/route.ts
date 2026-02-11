import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/auth/password-reset-service';
import { validateEmail } from '@/lib/auth/validation';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || !validateEmail(email)) {
            return NextResponse.json(
                { error: 'Adresse email invalide' },
                { status: 400 }
            );
        }

        // Récupérer IP et User-Agent pour l'audit
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        const userAgent = request.headers.get('user-agent') || undefined;

        await requestPasswordReset(email, ipAddress, userAgent);

        // Toujours la même réponse (anti-énumération)
        return NextResponse.json({
            message: 'Si cette adresse email est associée à un compte, vous recevrez un email de réinitialisation.',
        });
    } catch (error) {
        console.error('Erreur forgot-password:', error);
        return NextResponse.json(
            { message: 'Si cette adresse email est associée à un compte, vous recevrez un email de réinitialisation.' },
            { status: 200 } 
        );
    }
}