// lib/auth/validation.ts
import { ValidationError, RegisterFormData, LoginFormData } from '@/types/auth';
import { validatePasswordStrength } from './password';

/**
 * Valide une adresse email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Nettoie et normalise une adresse email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Valide un nom (prénom ou nom de famille)
 */
export function validateName(name: string): boolean {
  // Minimum 2 caractères, maximum 100, uniquement lettres, espaces, tirets et apostrophes
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,100}$/;
  return nameRegex.test(name);
}

/**
 * Nettoie un nom
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Valide les données d'inscription
 */
export function validateRegisterData(data: RegisterFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Email
  if (!data.email || data.email.trim() === '') {
    errors.push({ field: 'email', message: 'L\'email est requis' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Format d\'email invalide' });
  }

  // Prénom
  if (!data.firstName || data.firstName.trim() === '') {
    errors.push({ field: 'firstName', message: 'Le prénom est requis' });
  } else if (!validateName(data.firstName)) {
    errors.push({ 
      field: 'firstName', 
      message: 'Le prénom doit contenir entre 2 et 100 caractères alphabétiques' 
    });
  }

  // Nom
  if (!data.lastName || data.lastName.trim() === '') {
    errors.push({ field: 'lastName', message: 'Le nom est requis' });
  } else if (!validateName(data.lastName)) {
    errors.push({ 
      field: 'lastName', 
      message: 'Le nom doit contenir entre 2 et 100 caractères alphabétiques' 
    });
  }

  // Mot de passe
  if (!data.password) {
    errors.push({ field: 'password', message: 'Le mot de passe est requis' });
  } else {
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      passwordValidation.errors.forEach(err => {
        errors.push({ field: 'password', message: err });
      });
    }
  }

  // Confirmation du mot de passe
  if (data.password !== data.confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Les mots de passe ne correspondent pas' });
  }

  return errors;
}

/**
 * Valide les données de connexion
 */
export function validateLoginData(data: LoginFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.email || data.email.trim() === '') {
    errors.push({ field: 'email', message: 'L\'email est requis' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Format d\'email invalide' });
  }

  if (!data.password) {
    errors.push({ field: 'password', message: 'Le mot de passe est requis' });
  }

  return errors;
}

/**
 * Échappe les caractères HTML pour prévenir les XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
