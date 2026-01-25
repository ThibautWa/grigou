// components/InvitationsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Invitation, PERMISSION_LABELS } from '@/types/sharing';

interface InvitationsListProps {
  onInvitationAccepted?: (walletId: number) => void;
}

export default function InvitationsList({ onInvitationAccepted }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations?status=pending');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (invitationId: number, action: 'accept' | 'reject') => {
    setProcessingId(invitationId);

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(invitations.filter(inv => inv.id !== invitationId));
        
        if (action === 'accept' && onInvitationAccepted) {
          onInvitationAccepted(data.walletId);
        }
      }
    } catch (err) {
      console.error('Error handling invitation:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Invitations en attente ({invitations.length})
      </h3>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="p-4 bg-white border border-yellow-300 rounded-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {invitation.wallet.name}
                </p>
                {invitation.wallet.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {invitation.wallet.description}
                  </p>
                )}
                <div className="mt-2 text-sm text-gray-500">
                  <p>
                    Partagé par{' '}
                    <span className="font-medium text-gray-700">
                      {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                    </span>{' '}
                    ({invitation.invitedBy.email})
                  </p>
                  <p className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {PERMISSION_LABELS[invitation.permission]}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>
                      {format(new Date(invitation.invitedAt), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(invitation.id, 'reject')}
                  disabled={processingId === invitation.id}
                  className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  Refuser
                </button>
                <button
                  onClick={() => handleAction(invitation.id, 'accept')}
                  disabled={processingId === invitation.id}
                  className="px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {processingId === invitation.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Accepter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
