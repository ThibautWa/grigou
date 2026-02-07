// lib/auth/index.ts

// Export des fonctions d'authentification NextAuth
// Note: GET et POST sont dans handlers, pas exportés séparément
export { auth, signIn, signOut, handlers } from './auth';

// Export des fonctions de session
export {
  getServerSession,
  requireUserId,
  isAuthenticated,
} from './get-session';

// Export des permissions de wallets
export {
  getWalletPermission,
  canReadWallet,
  canWriteWallet,
  canAdminWallet,
  isWalletOwner,
  getAccessibleWalletIds,
  requireWalletAccess,
} from './wallet-permissions';
export type { WalletPermission } from './wallet-permissions';

// Export des services utilisateur
export {
  createUser,
  findUserByEmail,
  findUserById,
  verifyCredentials,
  updateLastLogin,
  changePassword,
} from './user-service';

// Export des fonctions de validation
export {
  validateEmail,
  normalizeEmail,
  validateName,
  sanitizeName,
  validateRegisterData,
  validateLoginData,
  escapeHtml,
} from './validation';

// Export des fonctions de mot de passe
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './password';