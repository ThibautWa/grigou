'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import ProfileModal from './ProfilModal';
import ChangePasswordModal from './ChangePasswordModal';
import { ChevronDown, KeyRound, LogOut, UserRound, LucideIcon } from 'lucide-react';
import { ThemeSegmented } from './theme/ThemeToggle';

function MenuItem({ onClick, Icon, danger, children }: { onClick: () => void; Icon: LucideIcon; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
        danger ? 'text-negative hover:bg-negative/10' : 'text-fg hover:bg-surface-2'
      }`}
    >
      <Icon className="h-4 w-4 opacity-80" aria-hidden />
      {children}
    </button>
  );
}

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-surface-3 animate-pulse"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = `${session.user.firstName?.[0] || ''}${session.user.lastName?.[0] || ''}`.toUpperCase();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleOpenProfile = () => {
    setIsOpen(false);
    setShowProfileModal(true);
  };

  const handleOpenPassword = () => {
    setIsOpen(false);
    setShowPasswordModal(true);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {initials}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium text-fg lg:block">
            {session.user.firstName}
          </span>
          <ChevronDown className={`h-4 w-4 text-fg-subtle transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>

        {isOpen && (
          <div className="popover absolute right-0 z-50 mt-2 w-72 py-1.5" role="menu">
            <div className="px-4 py-2.5">
              <p className="truncate text-sm font-semibold text-fg">
                {session.user.firstName} {session.user.lastName}
              </p>
              <p className="truncate text-xs text-fg-muted">{session.user.email}</p>
            </div>

            <div className="border-t border-line px-3 py-3">
              <p className="eyebrow mb-2 px-1">Apparence</p>
              <ThemeSegmented />
            </div>

            <div className="border-t border-line py-1.5">
              <MenuItem onClick={handleOpenProfile} Icon={UserRound}>Mon profil</MenuItem>
              <MenuItem onClick={handleOpenPassword} Icon={KeyRound}>Changer le mot de passe</MenuItem>
            </div>

            <div className="border-t border-line py-1.5">
              <MenuItem onClick={handleSignOut} Icon={LogOut} danger>Se déconnecter</MenuItem>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
}