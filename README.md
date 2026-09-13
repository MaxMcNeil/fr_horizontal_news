# fr_horizontal_news

Variante **horizontale (1920×1080)** du projet [FranceLiveNews](https://github.com/) — même pipeline (fetch RSS + cyber, refine, cluster, timeline, summarize via GitHub Actions), mais l'affichage est conçu comme un **overlay OBS pour un live YouTube au format horizontal**.

## Différences avec la version verticale

- **Format** : 1920×1080 (16:9) au lieu de 1080×1920 (9:16).
- **Une seule news à la fois** : chaque actualité occupe tout le reste de l'écran (sous le header, au-dessus de la barre du bas) et reste affichée **15 secondes** avant rotation.
- **Barre d'info fixe, très lisible (accessibilité malvoyants)** : ne défile pas, contenu statique :
  - « Informations & alertes sans filtre »
  - « 🔔 La chaîne à suivre pour ne rien manquer. »
- **Pop-up d'alerte critique** : se déclenche de temps en temps (toutes les 2 min) et couvre tout le reste de l'écran (même zone que la news courante), au lieu d'une simple boîte centrée.
- **Système de bip/son** : identique à l'original (bip via Web Audio API à chaque rotation et à chaque alerte critique).

## Pipeline (inchangé)

Les scripts (`scripts/fetchNews.mjs`, `scripts/fetchCyber.mjs`, `scripts/refineNews.mjs`, `scripts/clusterNews.mjs`, `scripts/timeline.mjs`, `scripts/summarize.mjs`) et le workflow GitHub Actions (`.github/workflows/update.yml`, toutes les 4h) sont strictement les mêmes que dans FranceLiveNews.

## Utilisation en overlay OBS

1. Héberger ce dépôt (GitHub Pages ou autre) pour obtenir une URL publique de `index.html`.
2. Dans OBS, ajouter une **Source Navigateur** :
   - URL : le lien vers `index.html`
   - Largeur : 1920, Hauteur : 1080
3. Placer cette source sur la scène de votre live horizontal.
