// components/WalletShareModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { WalletShare, Permission, PERMISSION_LABELS, PERMISSION_DESCRIPTIONS } from '@/types/sharing';

interface WalletShareModalProps {
  wallet: {
    id: number;
    name: string;
  };
  onClose: () => void;
}

export default function WalletShareModal({ wallet, onClose }: WalletShareModalProps) {
  const [shares, setShares] = useState<WalletShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Formulaire d'invitation
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'read' | 'write' | 'admin'>('read');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchShares();
  }, [wallet.id]);

  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/wallets/${wallet.id}/shares`);
      if (response.ok) {
        const data = await response.json();
        setShares(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Error fetching shares:', err);
      setError('Erreur lors du chargement des partages');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/wallets/${wallet.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission }),
      });

      if (response.ok) {
        const newShare = await response.json();
        setShares([newShare, ...shares]);
        setEmail('');
        setSuccess('Invitation envoyée avec succès');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de l\'invitation');
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setError('Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdatePermission = async (shareId: number, newPermission: Permission) => {
    try {
      const response = await fetch(`/api/wallets/${wallet.id}/shares/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission }),
      });

      if (response.ok) {
        setShares(shares.map(s => 
          s.id === shareId ? { ...s, permission: newPermission } : s
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Erreur lors de la mise à jour');
    }
  };

  const handleRemoveShare = async (shareId: number) => {
    if (!confirm('Voulez-vous vraiment retirer l\'accès à cet utilisateur ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/wallets/${wallet.id}/shares/${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShares(shares.filter(s => s.id !== shareId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('Error removing share:', err);
      setError('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Partager le portefeuille</h2>
            <p className="text-sm text-gray-600">{wallet.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          )}

          {/* Formulaire d'invitation */}
          <form onSubmit={handleInvite} className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Inviter un utilisateur</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de l'utilisateur
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilisateur@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission
                </label>
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as 'read' | 'write' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="read">Lecture seule</option>
                  <option value="write">Lecture/Écriture</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              {PERMISSION_DESCRIPTIONS[permission]}
            </p>

            <button
              type="submit"
              disabled={inviting}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {inviting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Envoi...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Inviter
                </>
              )}
            </button>
          </form>

          {/* Liste des partages */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Utilisateurs avec accès</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>Ce portefeuille n'est partagé avec personne</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className={`p-4 border rounded-lg ${
                      share.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-10 w-10 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center font-semibold">
                          {share.user.firstName[0]}{share.user.lastName[0]}
                        </div>
                        
                        <div>
                          <p className="font-medium text-gray-900">
                            {share.user.firstName} {share.user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{share.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {share.status === 'pending' && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                            En attente
                          </span>
                        )}

                        <select
                          value={share.permission}
                          onChange={(e) => handleUpdatePermission(share.id, e.target.value as Permission)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="read">Lecture</option>
                          <option value="write">Écriture</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Retirer l'accès"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
