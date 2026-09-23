# Format d'import de l'itinéraire

Ce document décrit le fichier à fournir pour mettre à jour le road book avec
la dernière version du voyage, jour par jour : **le parcours et les étapes**.

Le site ne lit qu'un seul fichier, [`src/data/trip.json`](../src/data/trip.json).
Le fichier d'import décrit ici en est un **sous-ensemble** : il reprend
exactement les mêmes noms de champs, pour qu'il puisse être fusionné tel quel,
sans conversion.

> Il n'y a pas de script d'import automatique : la fusion se fait à la main ou
> en demandant à Claude « importe `import/itineraire.json` dans `trip.json` »,
> en suivant les règles de la section [Règles de fusion](#règles-de-fusion).
> `npm run build` vérifie ensuite que le résultat est valide.

---

## Le fichier à fournir

- **Un seul fichier JSON**, encodé en UTF-8, par exemple `import/itineraire.json`.
- Il contient un bloc `days` (obligatoire) et, si des villes d'étape changent,
  un bloc `mapPoints`.
- Les hôtels, la page Pratique et les textes d'accueil ne sont **pas** concernés :
  on ne les met dans le fichier que si l'on veut les changer aussi.

```json
{
  "source": "Ride Planner, relevé du 23 septembre 2026, durées hors pauses",
  "mapPoints": {
    "Villard-de-Lans": [45.07, 5.55]
  },
  "days": [
    { "id": 1, "...": "..." },
    { "id": 2, "...": "..." }
  ]
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `source` | conseillé | D'où viennent les chiffres et à quelle date. Recopié dans `_notes.dataSource`. |
| `mapPoints` | si une ville d'étape est nouvelle | Coordonnées des villes de départ et d'arrivée, pour le schéma de la boucle. |
| `days` | oui | Une entrée par jour, dans l'ordre du voyage. |

---

## Une étape (`days[]`)

### Exemple complet

```json
{
  "id": 2,
  "date": "2026-10-04",
  "dayLabel": "Jour 2",
  "title": "La journée reine",
  "from": "Bourg-Saint-Maurice",
  "to": "Briançon",
  "distanceKm": 343,
  "ridingTime": "6h42",
  "summary": "Sept cols, dont le plus haut col routier des Alpes…",
  "highlights": [
    "Le Col de l'Iseran à 2 764 m, plus haut col routier des Alpes"
  ],
  "waypoints": [
    "Bourg-Saint-Maurice",
    "Val-d'Isère",
    "Bonneval-sur-Arc",
    "Lanslebourg",
    "Briançon"
  ],
  "cols": [
    { "name": "Col de l'Iseran", "altitude": 2764 },
    { "name": "Col du Mont-Cenis", "altitude": 2083, "optional": true }
  ],
  "ridePlannerUrl": "https://maps.harley-davidson.com/map/rides/XXXXXXXXXX/preview",
  "options": [
    {
      "name": "Col du Mont-Cenis",
      "altitude": 2083,
      "description": "Aller-retour depuis Lanslebourg, col et lac de barrage.",
      "addsKm": 30,
      "addsTime": "1h00",
      "decisionPoint": "À Lanslebourg, avant 13 h"
    }
  ],
  "warnings": [
    "Fermeture possible de l'Iseran sur neige sans préavis. Vérifier la veille."
  ]
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `id` | nombre entier | **oui** | Numéro du jour, à partir de 1. Unique. Donne l'adresse de la page (`/jour/2/`) et sert de clé pour la fusion. |
| `date` | texte `AAAA-MM-JJ` | **oui** | Date du jour, par ex. `"2026-10-04"`. |
| `dayLabel` | texte | **oui** | Libellé court, en principe `"Jour N"`. |
| `from` | texte | **oui** | Ville de départ. Doit être **identique** au `to` du jour précédent. |
| `to` | texte | **oui** | Ville d'arrivée (ville de l'hôtel du soir). |
| `distanceKm` | nombre | **oui** | Distance en km, **sans guillemets ni unité** : `343`, pas `"343 km"`. |
| `ridingTime` | texte | **oui** | Temps de roulage hors pauses : `"6h42"` ou `"6 h 42"`. Heures obligatoires, minutes facultatives (`"7h"`). |
| `title` | texte | non | Formule courte qui résume la journée. Sans titre, c'est `from → to` qui sert de titre. |
| `summary` | texte | non | Paragraphe de présentation de la journée. |
| `highlights` | liste de textes | non | Temps forts, une phrase par élément. |
| `waypoints` | liste de textes | non | **Le parcours** : localités traversées, dans l'ordre, du départ à l'arrivée. Le premier élément est `from`, le dernier est `to`. |
| `cols` | liste d'objets | non | Cols franchis, **dans l'ordre de passage** (c'est cet ordre qui dessine le profil d'altitude). Voir ci-dessous. |
| `ridePlannerUrl` | texte ou `null` | non | Lien de partage Ride Planner de l'étape (d'où l'on télécharge le GPX). `null` masque le bouton. |
| `options` | liste d'objets | non | Variantes possibles de la journée. Voir ci-dessous. `[]` s'il n'y en a pas. |
| `warnings` | liste de textes | non | Points de vigilance, affichés sur fond rouge. `[]` s'il n'y en a pas. |

Tous les textes sont **en français** (le build refuse l'anglais sur les pages
générées).

### Un col (`cols[]`)

Seuls `name` et `altitude` sont attendus ; le reste est facultatif et n'apparaît
que s'il est renseigné.

| Champ | Type | Description |
|---|---|---|
| `name` | texte | **Obligatoire.** Nom du col, écrit toujours de la même façon d'un jour à l'autre (les totaux dédoublonnent par nom). |
| `altitude` | nombre | Altitude en mètres, sans unité. `null` si inconnue. |
| `optional` | booléen | `true` si le col n'est emprunté qu'en variante : pointillé sur le profil. |
| `notes` | texte | Remarque courte (fermetures, gel, revêtement…). |
| `climbKm` | nombre | Longueur de la montée, en km (`13.4`, point décimal). |
| `gradient` | nombre | Pente moyenne, en % (`6.1`). |
| `hairpins` | nombre entier | Nombre d'épingles. |
| `climbTime` | texte | Durée de la montée, `"0h35"`. |
| `side` | texte | Versant emprunté, par ex. `"Ouest, depuis Taninges"`. |
| `surface` | liste de textes | Étiquettes courtes sur le revêtement. |
| `lastFuel` | texte | Dernier plein avant le col, par ex. `"Taninges · 12 km"`. |
| `stop` | texte | Arrêt conseillé. |
| `openWindow` | texte | Période d'ouverture, par ex. `"juin → octobre"`. |
| `coords` | `[latitude, longitude]` | Position du sommet, pour le bouton « Y aller ». |

### Une variante (`options[]`)

| Champ | Type | Description |
|---|---|---|
| `name` | texte | Nom de la variante. |
| `altitude` | nombre ou `null` | Altitude du col concerné, si c'en est un. |
| `description` | texte | Ce que la variante ajoute. |
| `addsKm` | nombre ou `null` | Kilomètres supplémentaires. |
| `addsTime` | texte ou `null` | Temps supplémentaire, `"1h00"`. |
| `decisionPoint` | texte | **Où et quand** la décision se prend sur la route. |

---

## Coordonnées des villes (`mapPoints`)

Chaque ville utilisée comme `from` ou `to` doit avoir ses coordonnées, sous la
forme `"Nom exact": [latitude, longitude]` en degrés décimaux :

```json
"mapPoints": {
  "Villard-de-Lans": [45.07, 5.55]
}
```

Le nom doit être écrit **exactement** comme dans `from` / `to` (accents,
tirets, majuscules). Il suffit de fournir les villes nouvelles : celles déjà
présentes dans `meta.mapPoints` sont conservées. Si une ville manque, le site
fonctionne quand même, mais le schéma de la boucle passe en disposition en
cercle.

---

## Règles de fusion

Voici comment le fichier d'import est appliqué à `src/data/trip.json` :

1. **Les étapes sont rapprochées par `id`.**
   - `id` existant : chaque champ fourni **remplace** celui de l'étape ; un
     champ absent du fichier d'import est **conservé** tel quel.
   - `id` nouveau : l'étape est ajoutée, avec `"hotel": null` si aucun hôtel
     n'est fourni.
   - Une étape présente dans `trip.json` mais absente de l'import est
     **conservée**. Pour la supprimer, le dire explicitement.
2. **Les listes sont remplacées en bloc**, jamais fusionnées élément par
   élément : fournir `cols`, `waypoints`, `highlights`, `options` ou `warnings`
   remplace toute la liste. Pour vider une liste, fournir `[]`.
3. **Le bloc `hotel` n'est pas touché** s'il est absent de l'import. Si une
   ville d'arrivée (`to`) change, penser à mettre l'hôtel à jour en même temps
   (voir le [README](../README.md#ajouter-les-informations-dun-hôtel-réservé)).
4. `mapPoints` est **ajouté** à `meta.mapPoints` (une ville déjà présente voit
   ses coordonnées remplacées).
5. `source` remplace `_notes.dataSource`.
6. Les étapes restent triées par `id` dans `trip.json`.

Les totaux de l'accueil (distance, roulage, nombre de cols, nombre d'étapes),
la navigation entre les jours et la page Hôtels se recalculent seuls : il n'y a
rien d'autre à mettre à jour.

---

## Vérifications avant de publier

```bash
npm test           # build + contrôle de la langue
npm run preview    # relire sur http://localhost:4173/
```

Le build s'arrête et nomme l'étape fautive si :

- un `id` manque ou est en double ;
- une `date` n'est pas au format `AAAA-MM-JJ` ;
- `from` ou `to` manque ;
- `distanceKm` n'est pas un nombre ;
- `ridingTime` ne s'écrit pas `"5h14"` ;
- un col n'a pas de nom, ou son `altitude` n'est pas un nombre.

Ce que le build **ne vérifie pas**, à contrôler à l'œil :

- le `from` de chaque jour est bien le `to` du jour précédent ;
- les dates se suivent sans trou ;
- les `waypoints` commencent par `from` et finissent par `to` ;
- les cols sont dans l'ordre de passage ;
- chaque ville d'étape figure dans `mapPoints`.

---

## Modèle vide à copier

```json
{
  "source": "Ride Planner, relevé du JJ mois AAAA, durées hors pauses",
  "mapPoints": {},
  "days": [
    {
      "id": 1,
      "date": "2026-10-03",
      "dayLabel": "Jour 1",
      "title": null,
      "from": "",
      "to": "",
      "distanceKm": 0,
      "ridingTime": "0h00",
      "summary": "",
      "highlights": [],
      "waypoints": [],
      "cols": [
        { "name": "", "altitude": 0 }
      ],
      "ridePlannerUrl": null,
      "options": [],
      "warnings": []
    }
  ]
}
```
