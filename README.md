# IZIINVEST

## En local
```
npm install
npm run dev
```

## Déploiement (Vercel — le plus simple)
1. Crée un repo GitHub et pousse ce dossier dedans.
2. Va sur vercel.com, "Add New Project", importe le repo.
3. Vercel détecte Vite automatiquement (build command `npm run build`, output `dist`). Clique Deploy.
4. Ton app est en ligne sur une URL `*.vercel.app`, avec un domaine perso possible ensuite dans Settings > Domains.

## Avant de déployer
- Remplace `advisorEmail`, `advisorWhatsapp` et `calendlyUrl` dans `src/App.jsx` (objet `BRAND`) par tes vraies infos.
- Les données du portefeuille sont stockées dans le navigateur de chaque visiteur (localStorage) : chacun voit son propre portefeuille, rien n'est partagé ni sauvegardé côté serveur. Pour un vrai compte utilisateur multi-appareils, il faudra brancher une base de données (Supabase, Firebase, etc.).
