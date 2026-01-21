# 🚀 Next.js 15 - Nouveautés utilisées dans Grigou

Ce projet utilise **Next.js 15** avec les dernières fonctionnalités :

## ⚡ Turbopack (Mode Dev)

Le projet est configuré pour utiliser Turbopack en développement :
```bash
npm run dev  # Lance automatiquement avec --turbopack
```

**Avantages** :
- Démarrage 10x plus rapide
- Hot Module Replacement instantané
- Meilleure performance de compilation

## 🎯 React 19

Le projet utilise React 19 avec :
- Meilleure gestion des états
- Performance optimisée
- Nouvelles APIs React

## 🔄 App Router amélioré

- Routes API optimisées
- Server Components par défaut
- Meilleure gestion du cache

## 📦 Optimisations automatiques

Next.js 15 apporte :
- **Compilation optimisée** pour la production
- **Tree-shaking amélioré**
- **Code splitting automatique**
- **Image optimization** native

## 🛠️ Configuration

### next.config.js
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Pour Docker
}

module.exports = nextConfig
```

### TypeScript
Le projet utilise les dernières définitions TypeScript pour Next.js 15.

## 📚 Documentation

Pour en savoir plus sur Next.js 15 :
- [Documentation officielle](https://nextjs.org/docs)
- [Guide de migration](https://nextjs.org/docs/app/building-your-application/upgrading)
- [Nouveautés React 19](https://react.dev/blog/2024/12/05/react-19)

---

**Note** : Toutes ces optimisations fonctionnent automatiquement, aucune configuration supplémentaire n'est nécessaire !
