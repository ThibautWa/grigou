'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import s from './LandingAuthModal.module.css';

type AuthTab = 'login' | 'register';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: AuthTab;
}

interface PasswordStrength {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
}

export default function LandingAuthModal({ isOpen, onClose, defaultTab = 'register' }: Props) {
    const router = useRouter();
    const [tab, setTab] = useState<AuthTab>(defaultTab);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [registerData, setRegisterData] = useState({
        email: '', firstName: '', lastName: '', password: '', confirmPassword: '',
    });

    useEffect(() => {
        if (isOpen) { setTab(defaultTab); setErrors({}); setSuccess(''); }
    }, [isOpen, defaultTab]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const passwordStrength = useMemo<PasswordStrength>(() => ({
        hasMinLength: registerData.password.length >= 8,
        hasUppercase: /[A-Z]/.test(registerData.password),
        hasLowercase: /[a-z]/.test(registerData.password),
        hasNumber: /[0-9]/.test(registerData.password),
        hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registerData.password),
    }), [registerData.password]);

    const isPasswordValid = useMemo(
        () => Object.values(passwordStrength).every(Boolean),
        [passwordStrength]
    );

    // ---- LOGIN ----
    const handleLogin = useCallback(async () => {
        setLoading(true);
        setErrors({});
        if (!loginData.email || !loginData.password) {
            setErrors({ general: 'Veuillez remplir tous les champs' });
            setLoading(false);
            return;
        }
        try {
            const result = await signIn('credentials', {
                email: loginData.email,
                password: loginData.password,
                redirect: false,
            });
            if (result?.error) {
                setErrors({ general: 'Email ou mot de passe incorrect' });
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch {
            setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' });
        } finally {
            setLoading(false);
        }
    }, [loginData, router]);

    // ---- REGISTER ----
    const handleRegister = useCallback(async () => {
        setLoading(true);
        setErrors({});
        const clientErrors: Record<string, string> = {};
        if (!registerData.email) clientErrors.email = "L'email est requis";
        if (!registerData.firstName) clientErrors.firstName = 'Le prénom est requis';
        if (!registerData.lastName) clientErrors.lastName = 'Le nom est requis';
        if (!isPasswordValid) clientErrors.password = 'Le mot de passe ne respecte pas les critères';
        if (registerData.password !== registerData.confirmPassword)
            clientErrors.confirmPassword = 'Les mots de passe ne correspondent pas';

        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData),
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
                    setErrors({ general: data.error || "Erreur lors de l'inscription" });
                }
                return;
            }
            setSuccess('Compte créé avec succès ! Connectez-vous maintenant.');
            setLoginData({ email: registerData.email, password: '' });
            setRegisterData({ email: '', firstName: '', lastName: '', password: '', confirmPassword: '' });
            setTab('login');
        } catch {
            setErrors({ general: 'Une erreur est survenue. Veuillez réessayer.' });
        } finally {
            setLoading(false);
        }
    }, [registerData, isPasswordValid]);

    const switchTab = (newTab: AuthTab) => {
        setTab(newTab);
        setErrors({});
        if (newTab !== 'login') setSuccess('');
    };

    if (!isOpen) return null;

    return (
        <div className={s.overlay} onClick={onClose}>
            <div className={s.modal} onClick={(e) => e.stopPropagation()}>

                {/* Close */}
                <button className={s.closeBtn} onClick={onClose} aria-label="Fermer">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className={s.header}>
                    <div className={s.logo}>Grigou</div>
                    <p className={s.tagline}>Le gestionnaire de budget populaire, simple et gratuit</p>
                </div>

                {/* Tabs */}
                <div className={s.tabs}>
                    <button className={`${s.tab} ${tab === 'register' ? s.tabActive : ''}`} onClick={() => switchTab('register')}>
                        Créer un compte
                    </button>
                    <button className={`${s.tab} ${tab === 'login' ? s.tabActive : ''}`} onClick={() => switchTab('login')}>
                        Se connecter
                    </button>
                </div>

                {/* Messages */}
                {success && (
                    <div className={s.success}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {success}
                    </div>
                )}
                {errors.general && (
                    <div className={s.error}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        {errors.general}
                    </div>
                )}

                {/* ======== LOGIN ======== */}
                {tab === 'login' && (
                    <div className={s.form}>
                        <div className={s.formGroup}>
                            <label>Adresse email</label>
                            <input
                                type="email" placeholder="jean@exemple.fr" autoComplete="email"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                        </div>
                        <div className={s.formGroup}>
                            <label>Mot de passe</label>
                            <div className={s.passwordWrap}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••" autoComplete="current-password"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                />
                                <button type="button" className={s.passwordToggle} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <button className={s.submit} onClick={handleLogin} disabled={loading}>
                            {loading ? (
                                <span className={s.spinner}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    Connexion...
                                </span>
                            ) : 'Se connecter'}
                        </button>
                        <div className={s.footerLink}>
                            <a href="/forgot-password">Mot de passe oublié ?</a>
                        </div>
                        <div className={s.switchText}>
                            Pas encore de compte ?{' '}
                            <button onClick={() => switchTab('register')}>Créer un compte</button>
                        </div>
                    </div>
                )}

                {/* ======== REGISTER ======== */}
                {tab === 'register' && (
                    <div className={s.form}>
                        <div className={s.formRow}>
                            <div className={s.formGroup}>
                                <label>Prénom</label>
                                <input
                                    type="text" placeholder="Jean" autoComplete="given-name"
                                    value={registerData.firstName}
                                    onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                                />
                                {errors.firstName && <span className={s.fieldError}>{errors.firstName}</span>}
                            </div>
                            <div className={s.formGroup}>
                                <label>Nom</label>
                                <input
                                    type="text" placeholder="Dupont" autoComplete="family-name"
                                    value={registerData.lastName}
                                    onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                                />
                                {errors.lastName && <span className={s.fieldError}>{errors.lastName}</span>}
                            </div>
                        </div>
                        <div className={s.formGroup}>
                            <label>Adresse email</label>
                            <input
                                type="email" placeholder="jean@exemple.fr" autoComplete="email"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            />
                            {errors.email && <span className={s.fieldError}>{errors.email}</span>}
                        </div>
                        <div className={s.formGroup}>
                            <label>Mot de passe</label>
                            <div className={s.passwordWrap}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="8 caractères minimum" autoComplete="new-password"
                                    value={registerData.password}
                                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                />
                                <button type="button" className={s.passwordToggle} onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                    {showPassword ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    )}
                                </button>
                            </div>
                            {registerData.password && (
                                <ul className={s.criteria}>
                                    <CriteriaItem met={passwordStrength.hasMinLength} text="Au moins 8 caractères" />
                                    <CriteriaItem met={passwordStrength.hasUppercase} text="Une lettre majuscule" />
                                    <CriteriaItem met={passwordStrength.hasLowercase} text="Une lettre minuscule" />
                                    <CriteriaItem met={passwordStrength.hasNumber} text="Un chiffre" />
                                    <CriteriaItem met={passwordStrength.hasSpecial} text="Un caractère spécial (!@#$%...)" />
                                </ul>
                            )}
                            {errors.password && <span className={s.fieldError}>{errors.password}</span>}
                        </div>
                        <div className={s.formGroup}>
                            <label>Confirmer le mot de passe</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••" autoComplete="new-password"
                                value={registerData.confirmPassword}
                                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && isPasswordValid && handleRegister()}
                            />
                            {errors.confirmPassword && <span className={s.fieldError}>{errors.confirmPassword}</span>}
                            {registerData.confirmPassword && registerData.password === registerData.confirmPassword && (
                                <span className={s.fieldSuccess}>
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    Les mots de passe correspondent
                                </span>
                            )}
                        </div>
                        <button className={s.submit} onClick={handleRegister} disabled={loading || !isPasswordValid}>
                            {loading ? (
                                <span className={s.spinner}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    Création en cours...
                                </span>
                            ) : 'Créer mon compte gratuitement'}
                        </button>
                        <div className={s.switchText}>
                            Déjà inscrit ?{' '}
                            <button onClick={() => switchTab('login')}>Se connecter</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CriteriaItem({ met, text }: { met: boolean; text: string }) {
    return (
        <li className={`${s.criteriaItem} ${met ? s.criteriaMet : ''}`}>
            {met ? (
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
            )}
            {text}
        </li>
    );
}