// Exemple de modification à apporter à app/page.tsx
// ================================================
// 
// 1. Ajouter l'import du UserMenu en haut du fichier :

import UserMenu from '@/components/UserMenu';

// 2. Modifier le header (vers la ligne 180-190) :
// 
// AVANT :
// -------
// <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
//   <h1 className="text-4xl font-bold text-gray-800">
//     💰 Grigou - Gestionnaire de Budget
//   </h1>
//
//   <WalletSelector
//     selectedWalletId={selectedWalletId}
//     onWalletChange={selectWallet}
//     onManageWallets={() => setShowWalletManager(true)}
//   />
// </div>

// APRÈS :
// -------
// <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
//   <h1 className="text-4xl font-bold text-gray-800">
//     💰 Grigou - Gestionnaire de Budget
//   </h1>
//
//   <div className="flex items-center gap-4">
//     <WalletSelector
//       selectedWalletId={selectedWalletId}
//       onWalletChange={selectWallet}
//       onManageWallets={() => setShowWalletManager(true)}
//     />
//     <UserMenu />
//   </div>
// </div>

// ================================================
// Voici le composant complet du header pour référence :

export function HeaderExample() {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <h1 className="text-4xl font-bold text-gray-800">
        💰 Grigou - Gestionnaire de Budget
      </h1>

      <div className="flex items-center gap-4">
        {/* Sélecteur de wallet */}
        <WalletSelector
          selectedWalletId={1}
          onWalletChange={() => {}}
          onManageWallets={() => {}}
        />
        
        {/* Menu utilisateur avec déconnexion */}
        <UserMenu />
      </div>
    </div>
  );
}
