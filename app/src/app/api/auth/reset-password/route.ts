import { NextRequest, NextResponse } from 'next/server';
import { validateResetToken, resetPasswordWithToken } from '@/lib/auth/password-reset-service';
import { validatePasswordStrength } from '@/lib/auth/password';

// GET : valider un token (pour vérifier avant d'afficher le formulaire)
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token');

        if (!token) {
            return NextResponse.json({ valid: false, error: 'Token manquant' }, { status: 400 });
        }

        const result = await validateResetToken(token);
        return NextResponse.json({ valid: result.valid });
    } catch (error) {
        console.error('Erreur validation token:', error);
        return NextResponse.json({ valid: false }, { status: 500 });
    }
}

// POST : réinitialiser le mot de passe
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token et mot de passe requis' },
                { status: 400 }
            );
        }

        // Valider la force du mot de passe
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { error: 'Le mot de passe ne respecte pas les critères de sécurité', details: passwordValidation.errors },
                { status: 400 }
            );
        }

        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';
        const userAgent = request.headers.get('user-agent') || undefined;

        const result = await resetPasswordWithToken(token, password, ipAddress, userAgent);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json({
            message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
        });
    } catch (error) {
        console.error('Erreur reset-password:', error);
        return NextResponse.json(
            { error: 'Une erreur est survenue' },
            { status: 500 }
        );
    }
}