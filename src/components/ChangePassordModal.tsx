'use client';

import { useState, useEffect, useMemo } from 'react';

interface ChangePasswordModalProps {
    onClose: () => void;
}

interface PasswordStrength {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // Fermer avec Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Validation du nouveau mot de passe
    const passwordStrength = useMemo<PasswordStrength>(() => ({
        hasMinLength: formData.newPassword.length >= 8,
        hasUppercase: /[A-Z]/.test(formData.newPassword),
        hasLowercase: /[a-z]/.test(formData.newPassword),
        hasNumber: /[0-9]/.test(formData.newPassword),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword),
    }), [formData.newPassword]);

    const isPasswordValid = useMemo(() =>
        Object.values(passwordStrength).every(Boolean),
        [passwordStrength]
    );

    const passwordsMatch = formData.newPassword === formData.confirmPassword && formData.confirmPassword !== '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validations
        if (!formData.currentPassword) {
            setError('Le mot de passe actuel est requis');
            setLoading(false);
            return;
        }

        if (!isPasswordValid) {
            setError('Le nouveau mot de passe ne respecte pas les critères de sécurité');
            setLoading(false);
            return;
        }

        if (!passwordsMatch) {
            setError('Les nouveaux mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('Le nouveau mot de passe doit être différent de l\'ancien');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user/password', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du changement de mot de passe');
            }

            setSuccess('Mot de passe changé avec succès');

            // Réinitialiser le formulaire
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            // Fermer après un court délai
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const PasswordCriteria = ({ met, text }: { met: boolean; text: string }) => (
        <li className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-500'}`}>
            {met ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                </svg>
            )}
            {text}
        </li>
    );

    const PasswordInput = ({
        id,
        label,
        value,
        onChange,
        showPassword,
        onToggleShow,
        placeholder,
    }: {
        id: string;
        label: string;
        value: string;
        onChange: (value: string) => void;
        showPassword: boolean;
        onToggleShow: () => void;
        placeholder?: string;
    }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={placeholder || '••••••••'}
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Changer le mot de passe
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
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
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Mot de passe actuel */}
                        <PasswordInput
                            id="currentPassword"
                            label="Mot de passe actuel *"
                            value={formData.currentPassword}
                            onChange={(value) => setFormData({ ...formData, currentPassword: value })}
                            showPassword={showPasswords.current}
                            onToggleShow={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        />

                        <hr className="border-gray-200" />

                        {/* Nouveau mot de passe */}
                        <PasswordInput
                            id="newPassword"
                            label="Nouveau mot de passe *"
                            value={formData.newPassword}
                            onChange={(value) => setFormData({ ...formData, newPassword: value })}
                            showPassword={showPasswords.new}
                            onToggleShow={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        />

                        {/* Critères du mot de passe */}
                        {formData.newPassword && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Critères de sécurité :
                                </p>
                                <ul className="space-y-1">
                                    <PasswordCriteria met={passwordStrength.hasMinLength} text="Au moins 8 caractères" />
                                    <PasswordCriteria met={passwordStrength.hasUppercase} text="Une lettre majuscule" />
                                    <PasswordCriteria met={passwordStrength.hasLowercase} text="Une lettre minuscule" />
                                    <PasswordCriteria met={passwordStrength.hasNumber} text="Un chiffre" />
                                    <PasswordCriteria met={passwordStrength.hasSpecial} text="Un caractère spécial (!@#$%...)" />
                                </ul>
                            </div>
                        )}

                        {/* Confirmer le nouveau mot de passe */}
                        <PasswordInput
                            id="confirmPassword"
                            label="Confirmer le nouveau mot de passe *"
                            value={formData.confirmPassword}
                            onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                            showPassword={showPasswords.confirm}
                            onToggleShow={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        />

                        {/* Indicateur de correspondance */}
                        {formData.confirmPassword && (
                            <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordsMatch ? (
                                    <>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Les mots de passe correspondent
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        Les mots de passe ne correspondent pas
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            <strong>🔒 Conseil :</strong> Utilisez un mot de passe unique que vous n'utilisez pas sur d'autres sites.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid || !passwordsMatch || !formData.currentPassword}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Changement...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Changer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}