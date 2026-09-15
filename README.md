# Road Trip Alpes 2026 — road book

Site statique du road book moto : 7 étapes, Lausanne → Méditerranée → Lausanne.

Il fonctionne **entièrement hors ligne** une fois ouvert une première fois, ce
qui est le point essentiel : il n'y a pas de réseau dans les cols.

- **Tout le contenu est dans un seul fichier : [`src/data/trip.json`](src/data/trip.json).**
  Il n'y a jamais besoin de toucher au code pour mettre le site à jour.

---

## Mettre à jour le contenu

Tout se passe dans `src/data/trip.json`. Après chaque modification :

```bash
npm run build      # régénère le site dans dist/
npm run preview    # puis ouvrir http://localhost:4173/ pour relire
```

Le build refuse de passer si une donnée est mal formée (date invalide,
distance qui n'est pas un nombre, statut d'hôtel inconnu…) et affiche
exactement quelle étape corriger.

### Ajouter les informations d'un hôtel réservé

Chaque étape a un bloc `hotel`. Au départ il ne contient que le nom et la
ville, et le statut `"à réserver"` :

```json
"hotel": {
  "name": "Hôtel l'Autantic",
  "city": "Bourg-Saint-Maurice",
  "status": "à réserver",
  "address": null,
  "phone": null,
  "url": null,
  "parking": null,
  "notes": null,
  "bookingRef": null
}
```

Une fois la réservation faite, remplir les champs et changer le statut :

```json
"hotel": {
  "name": "Hôtel l'Autantic",
  "city": "Bourg-Saint-Maurice",
  "status": "confirmé",
  "address": "69 Route d'Hauteville, 73700 Bourg-Saint-Maurice",
  "phone": "+33 4 79 07 01 70",
  "url": "https://autantic.fr",
  "parking": "Garage fermé à code, gratuit pour les motos",
  "notes": "Dîner en ville, 10 min à pied",
  "bookingRef": "ABC12345"
}
```

- `status` accepte exactement trois valeurs : `"à réserver"` (badge laiton),
  `"réservé"` (badge vert) et `"confirmé"` (badge vert plein).
- Un champ laissé à `null` disparaît simplement de la page, sans rien casser.
- Dès qu'une `address` est renseignée, elle devient un lien qui ouvre
  l'application de navigation du téléphone. Le `phone` devient un lien d'appel.
- Une étape sans hôtel du tout (le retour à la maison) : mettre `"hotel": null`.

### Corriger une distance ou un temps de roulage

Dans l'étape concernée :

```json
"distanceKm": 286,
"ridingTime": "5h14",
```

- `distanceKm` est un **nombre**, sans guillemets et sans unité.
- `ridingTime` s'écrit toujours `"5h14"`. Le site l'affiche en `5 h 14`.

Les totaux de la page d'accueil (distance, roulage, nombre de cols, nombre
d'étapes) sont recalculés tout seuls. Il n'y a rien d'autre à changer.

### Ajouter ou retirer un col

Dans le tableau `cols` de l'étape, dans **l'ordre de passage** — c'est cet
ordre qui dessine le profil d'altitude :

```json
"cols": [
  { "name": "Col de l'Iseran", "altitude": 2764 },
  { "name": "Col du Galibier", "altitude": 2642 }
]
```

`altitude` est un nombre, en mètres. On peut ajouter `"optional": true` à un
col emprunté seulement en cas de variante : il apparaît alors en pointillé sur
le profil et marqué « variante » dans la liste.

### Ajouter une étape

Copier un bloc d'étape complet dans `days`, puis :

1. incrémenter `id` (c'est lui qui donne l'adresse de la page, `/jour/8/`) ;
2. corriger `date`, `dayLabel`, `from`, `to`, `distanceKm`, `ridingTime` ;
3. ajouter le point de la nouvelle ville d'étape dans `meta.mapPoints`, sous
   la forme `"Nom de la ville": [latitude, longitude]` — sinon le schéma de la
   boucle bascule automatiquement sur une disposition en cercle.

La navigation précédent / suivant, la page Hôtels, le schéma de la boucle et
les totaux se mettent à jour seuls.

### Déplacer une étape du soir

Changer le `to` de l'étape, le `from` de la suivante, et le `hotel`. Penser à
ajouter la nouvelle ville dans `meta.mapPoints`.

### Ajouter une variante (option)

```json
"options": [
  {
    "name": "Col du Mont-Cenis",
    "altitude": 2083,
    "description": "Aller-retour depuis Lanslebourg, col et lac de barrage.",
    "addsKm": 30,
    "addsTime": "1h00",
    "decisionPoint": "À Lanslebourg, avant 13 h"
  }
]
```

`decisionPoint` est le champ important : c'est **où et quand** la décision se
prend sur la route. `addsKm` et `addsTime` peuvent valoir `null` si le chiffre
n'est pas connu.

### Ajouter un point de vigilance

Un simple tableau de phrases, affiché sur fond rouge :

```json
"warnings": [
  "Le Col de la Ramaz peut fermer sur neige. Vérifier la veille."
]
```

### Modifier la page Pratique

Dans `practical.sections`. Chaque section est un titre et une liste de lignes :

```json
{ "title": "Numéros utiles", "items": ["Secours européen : 112"] }
```

Une ligne de la forme `"Libellé : 112"` devient automatiquement un bouton
d'appel. Une ligne contenant un nom de domaine (`savoie-route.fr`) devient
automatiquement un lien.

### Ajouter les traces GPX

Déposer les fichiers exportés depuis Ride Planner dans `public/gpx/`, nommés
`J1.gpx` … `J7.gpx` (le nom attendu est celui du champ `gpxFile` de l'étape).

Tant qu'un fichier est absent, le bouton de téléchargement ne s'affiche pas —
il n'y a jamais de lien mort — et le build le signale en fin de compilation.

Pour ajouter le lien Ride Planner d'une étape, renseigner `ridePlannerUrl`.

---

## Publier les changements

```bash
git add -A
git commit -m "Hôtel de Briançon confirmé"
git push
```

GitHub Actions reconstruit et publie le site automatiquement
(voir `.github/workflows/deploy.yml`). Compter une à deux minutes.

Sur le téléphone, la nouvelle version est récupérée à la prochaine ouverture
avec du réseau : le service worker sert d'abord la copie enregistrée, puis
télécharge la mise à jour en arrière-plan pour la fois suivante.

---

## Utilisation sur le téléphone

Ouvrir le site une fois **avec du réseau**, puis « Ajouter à l'écran d'accueil ».
Il s'ouvre alors en plein écran, sans barre de navigateur, et fonctionne ensuite
sans aucune connexion.

Un bandeau laiton « Hors ligne — contenu enregistré » apparaît dès que le
réseau est perdu.

Sur une page d'étape, on passe au jour suivant ou précédent **en balayant
horizontalement**, ou avec les boutons en bas de page.

---

## Pour le développement

Pas de dépendance, pas de framework. Node 20 ou plus récent suffit.

```bash
npm run build      # génère dist/
npm run preview    # build + serveur local sur le port 4173
npm run verifier   # contrôle qu'aucune chaîne visible n'est en anglais
npm test           # build + vérification
npm run icons      # régénère les icônes PNG depuis scripts/generate-icons.mjs
```

### Organisation

| Chemin | Rôle |
|---|---|
| `src/data/trip.json` | **tout le contenu** |
| `src/styles/tokens.css` | couleurs, tailles, espacements |
| `src/styles/app.css` | styles des composants |
| `src/templates/` | génération HTML de chaque vue |
| `src/lib/format.js` | formats français (dates, nombres, durées, espaces insécables) |
| `src/lib/profile.js` | profils d'altitude et schéma de boucle, en SVG |
| `src/sw.template.js` | service worker (stratégie cache d'abord) |
| `public/` | fichiers copiés tels quels (icônes, GPX, `app.js`) |
| `build.mjs` | le générateur complet |

### Publication ailleurs que sur GitHub Pages

Le site est généré pour être servi à la racine du domaine. Pour le publier dans
un sous-dossier, passer le chemin de base au build :

```bash
BASE_PATH=/roadtrip/ npm run build
```

Sur Netlify : commande `npm run build`, dossier publié `dist`.

### Langue

Toute chaîne visible par un humain est en français, sans exception. Le code,
lui, est en anglais (noms de fichiers, de variables, de classes CSS,
commentaires). `npm run verifier` échoue si un mot anglais réapparaît dans une
page générée.
