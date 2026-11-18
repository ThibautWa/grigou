'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Une erreur est survenue');
            }

            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="w-full">
                <div className="card w-full p-6 text-center sm:p-8">
                    <div className="w-16 h-16 bg-positive/15 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-positive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-fg mb-2">Vérifiez vos emails</h2>
                    <p className="text-fg-muted mb-6">
                        Si l'adresse <strong>{email}</strong> est associée à un compte,
                        vous recevrez un email avec un lien de réinitialisation.
                    </p>
                    <p className="text-sm text-fg-muted mb-6">
                        Pensez à vérifier vos spams si vous ne voyez rien dans votre boîte de réception.
                    </p>
                    <Link
                        href="/login"
                        className="inline-block text-accent hover:text-accent-hover font-medium"
                    >
                        ← Retour à la connexion
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="max-w-md w-full">
                <div className="card p-6 sm:p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-fg">Mot de passe oublié ?</h1>
                        <p className="text-fg-muted mt-2">
                            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 bg-negative/10 border border-negative/30 text-negative px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label htmlFor="email" className="field-label">
                                Adresse email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                autoComplete="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="field !py-2.5"
                                placeholder="votre@email.com"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-accent text-accent-fg py-3 px-4 rounded-lg font-medium hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/25 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Envoi en cours...
                                </span>
                            ) : (
                                'Envoyer le lien de réinitialisation'
                            )}
                        </button>
                    </form>

                    {/* Back to login */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="text-sm text-accent hover:text-accent-hover font-medium"
                        >
                            ← Retour à la connexion
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}