'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ProfileModalProps {
    onClose: () => void;
    onUpdated?: () => void;
}

export default function ProfileModal({ onClose, onUpdated }: ProfileModalProps) {
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Initialiser le formulaire avec les données de la session
    useEffect(() => {
        if (session?.user) {
            setFormData({
                firstName: session.user.firstName || '',
                lastName: session.user.lastName || '',
                email: session.user.email || '',
            });
        }
    }, [session]);

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validation côté client
        if (!formData.firstName.trim()) {
            setError('Le prénom est requis');
            setLoading(false);
            return;
        }
        if (!formData.lastName.trim()) {
            setError('Le nom est requis');
            setLoading(false);
            return;
        }
        if (!formData.email.trim()) {
            setError('L\'email est requis');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim().toLowerCase(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la mise à jour');
            }

            setSuccess('Profil mis à jour avec succès');

            // CORRECTION : Mettre à jour la session NextAuth avec les nouvelles données
            await updateSession({
                user: {
                    ...session?.user,
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    email: data.user.email,
                    name: `${data.user.firstName} ${data.user.lastName}`, // Important pour NextAuth
                },
            });

            // Appeler le callback si fourni
            if (onUpdated) {
                onUpdated();
            }

            // Forcer le rafraîchissement de la page après un court délai
            setTimeout(() => {
                router.refresh(); // Rafraîchit les Server Components
                onClose();
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const hasChanges = session?.user && (
        formData.firstName !== session.user.firstName ||
        formData.lastName !== session.user.lastName ||
        formData.email !== session.user.email
    );

    return (
        <div className="modal-backdrop">
            <div className="modal-panel max-w-md w-full">
                {/* Header */}
                <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mon profil
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-fg-subtle hover:text-fg transition-colors"
                        disabled={loading}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Messages */}
                    {error && (
                        <div className="mb-4 bg-negative/10 border border-negative/30 text-negative px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-positive/10 border border-positive/30 text-positive px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </div>
                    )}

                    {/* Avatar */}
                    <div className="flex justify-center mb-6">
                        <div className="h-20 w-20 bg-accent text-accent-fg rounded-full flex items-center justify-center font-bold text-2xl">
                            {formData.firstName[0]?.toUpperCase() || ''}{formData.lastName[0]?.toUpperCase() || ''}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Prénom */}
                        <div>
                            <label className="field-label">
                                Prénom *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="field"
                                placeholder="Jean"
                            />
                        </div>

                        {/* Nom */}
                        <div>
                            <label className="field-label">
                                Nom *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="field"
                                placeholder="Dupont"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="field-label">
                                Adresse email *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="field"
                                placeholder="jean.dupont@email.com"
                            />
                            <p className="mt-1 text-xs text-fg-muted">
                                Si vous changez votre email, vous devrez l'utiliser pour vous reconnecter.
                            </p>
                        </div>

                        {/* Informations supplémentaires */}
                        <div className="pt-4 border-t border-line">
                            <p className="text-sm text-fg-muted">
                                <span className="font-medium">Membre depuis :</span>{' '}
                                {session?.user ? 'Données non disponibles' : '—'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="btn-secondary flex-1"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !hasChanges}
                            className="btn-primary flex-1"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Enregistrement...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Enregistrer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}