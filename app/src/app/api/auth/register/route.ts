// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUser, validateRegisterData } from '@/lib/auth';
import { RegisterFormData } from '@/types/auth';

// Rate limiting simple (en production, utiliser Redis)
const registerAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = registerAttempts.get(ip);

  if (!attempt || now - attempt.lastAttempt > WINDOW_MS) {
    registerAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }

  attempt.count++;
  attempt.lastAttempt = now;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
        { status: 429 }
      );
    }

    const body: RegisterFormData = await request.json();

    // Validation des données
    const validationErrors = validateRegisterData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { errors: validationErrors },
        { status: 400 }
      );
    }

    // Création de l'utilisateur
    const user = await createUser({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    });

    // Retourner l'utilisateur sans données sensibles
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        message: 'Compte créé avec succès',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse email' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500 }
    );
  }
}
