// types/sharing.ts

export type Permission = 'read' | 'write' | 'admin' | 'owner';

export interface WalletShare {
  id: number;
  walletId: number;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  permission: Permission;
  invitedAt: string;
  acceptedAt: string | null;
  invitedBy: {
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  status: 'pending' | 'accepted';
}

export interface Invitation {
  id: number;
  wallet: {
    id: number;
    name: string;
    description: string | null;
  };
  permission: Permission;
  invitedAt: string;
  acceptedAt: string | null;
  owner: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  invitedBy: {
    email: string;
    firstName: string;
    lastName: string;
  };
  status: 'pending' | 'accepted';
}

export interface ShareFormData {
  email: string;
  permission: 'read' | 'write' | 'admin';
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  write: 'Lecture/Écriture',
  read: 'Lecture seule',
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  owner: 'Tous les droits, y compris la suppression',
  admin: 'Gestion du wallet et partage avec d\'autres',
  write: 'Voir et ajouter/modifier des transactions',
  read: 'Voir uniquement les transactions',
};
