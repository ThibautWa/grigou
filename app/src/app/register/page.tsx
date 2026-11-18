// app/register/page.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation du mot de passe en temps réel
  const passwordStrength = useMemo<PasswordStrength>(() => ({
    hasMinLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
  }), [formData.password]);

  const isPasswordValid = useMemo(() => 
    Object.values(passwordStrength).every(Boolean),
    [passwordStrength]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Validation côté client
    const clientErrors: Record<string, string> = {};

    if (!formData.email) {
      clientErrors.email = 'L\'email est requis';
    }
    if (!formData.firstName) {
      clientErrors.firstName = 'Le prénom est requis';
    }
    if (!formData.lastName) {
      clientErrors.lastName = 'Le nom est requis';
    }
    if (!isPasswordValid) {
      clientErrors.password = 'Le mot de passe ne respecte pas les critères';
    }
    if (formData.password !== formData.confirmPassword) {
      clientErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const newErrors: Record<string, string> = {};
          data.errors.forEach((err: { field: string; message: string }) => {
            newErrors[err.field] = err.message;
          });
          setErrors(newErrors);
        } else {
          setErrors({ general: data.error || 'Erreur lors de l\'inscription' });
        }
        return;
      }

      // Redirection vers la page de login avec message de succès
      router.push('/login?registered=true');
    } catch (err) {
      console.error('Registration error:', err);
      setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  const PasswordCriteria = ({ met, text }: { met: boolean; text: string }) => (
    <li className={`flex items-center gap-2 text-sm ${met ? 'text-positive' : 'text-fg-muted'}`}>
      {met ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
        </svg>
      )}
      {text}
    </li>
  );

  return (
    <div className="w-full">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-fg">Créer un compte</h1>
          <p className="mt-2 text-fg-muted">
            Commencez à gérer votre budget efficacement
          </p>
        </div>

        {/* Error message */}
        {errors.general && (
          <div className="bg-negative/10 border border-negative/30 text-negative px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errors.general}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-8">
          {/* Nom et Prénom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="field-label">
                Prénom
              </label>
              <input
                id="firstName"
                type="text"
                required
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={`field !py-2.5 ${
                  errors.firstName ? 'border-negative/40' : 'border-line-strong'
                }`}
                placeholder="Jean"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-negative">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="field-label">
                Nom
              </label>
              <input
                id="lastName"
                type="text"
                required
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`field !py-2.5 ${
                  errors.lastName ? 'border-negative/40' : 'border-line-strong'
                }`}
                placeholder="Dupont"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-negative">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="field-label">
              Adresse email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`field !py-2.5 ${
                errors.email ? 'border-negative/40' : 'border-line-strong'
              }`}
              placeholder="votre@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-negative">{errors.email}</p>
            )}
          </div>

          {/* Mot de passe */}
          <div>
            <label htmlFor="password" className="field-label">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`field !py-2.5 pr-12 ${
                  errors.password ? 'border-negative/40' : 'border-line-strong'
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Critères du mot de passe */}
            {formData.password && (
              <ul className="mt-3 space-y-1">
                <PasswordCriteria met={passwordStrength.hasMinLength} text="Au moins 8 caractères" />
                <PasswordCriteria met={passwordStrength.hasUppercase} text="Une lettre majuscule" />
                <PasswordCriteria met={passwordStrength.hasLowercase} text="Une lettre minuscule" />
                <PasswordCriteria met={passwordStrength.hasNumber} text="Un chiffre" />
                <PasswordCriteria met={passwordStrength.hasSpecial} text="Un caractère spécial (!@#$%...)" />
              </ul>
            )}
            {errors.password && (
              <p className="mt-1 text-sm text-negative">{errors.password}</p>
            )}
          </div>

          {/* Confirmation du mot de passe */}
          <div>
            <label htmlFor="confirmPassword" className="field-label">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={`field !py-2.5 ${
                errors.confirmPassword ? 'border-negative/40' : 
                formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-positive/40' : 
                'border-line-strong'
              }`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-negative">{errors.confirmPassword}</p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="mt-1 text-sm text-positive flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Les mots de passe correspondent
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordValid}
            className="btn-primary w-full !py-2.5"
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Création en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Créer mon compte
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-fg-muted">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
