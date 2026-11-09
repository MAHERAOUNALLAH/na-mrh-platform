# NA-MRH — Matrice des habilitations

Document de référence pour le développement du back-end (contrôle d'accès / RBAC).

---

## 1. Rôles du système

Une personne cumule **un niveau d'accès pays** (obligatoire, un seul) **+ zéro ou plusieurs rôles additionnels** (GTT, Comité de Pilotage). Le Secrétariat et le Public sont des catégories à part.

| Catégorie | Rôle | Portée |
|---|---|---|
| **Niveau d'accès pays** (un seul par personne) | Lecteur | Son pays |
| | Contributeur | Son pays |
| | Validateur | Son pays |
| | Administrateur pays (coordinateur national) | Son pays |
| **Rôle additionnel — GTT** (cumulable, un rôle par GTT, plusieurs GTT possibles) | Membre d'un GTT | Le(s) GTT concerné(s) |
| | Co-lead d'un GTT | Le(s) GTT concerné(s) |
| | Lead d'un GTT | Le(s) GTT concerné(s) |
| **Rôle additionnel — Comité de Pilotage** (cumulable) | Membre du Comité de Pilotage | Régional |
| | Vice-président du Comité de Pilotage | Régional |
| | Président du Comité de Pilotage | Régional |
| **Secrétariat** (catégorie à part, non liée à un pays) | Collaborateur du Secrétariat | Régional |
| | Coordinateur(-rice) régional(e) | Régional |
| **Externe** | Expert externe (accès ponctuel) | Le(s) GTT/document(s) assigné(s), durée limitée |
| | Public (non connecté) | Contenu public uniquement |

**Exemple concret** : Amine Belkacem est *Administrateur pays* (Algérie) **+** *Lead* du GTT Homologation **+** *Président* du Comité de Pilotage. Les trois rôles s'additionnent.

---

## 2. Circuit documentaire

| Action | Lecteur | Contributeur | Validateur | Admin pays | Lead GTT | Co-lead GTT | Secrétariat | Comité de Pilotage |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Consulter les documents de son GTT | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Créer un brouillon (draft) | — | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| Commenter un brouillon | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Demander une révision | — | — | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Transmettre au Secrétariat | — | — | — | — | ✔ | ✔* | — | — |
| Valider formellement un document | — | — | ✔** | — | — | — | ✔ | ✔ |
| Soumettre au Comité de Pilotage | — | — | — | — | — | — | ✔ | — |
| Diffuser en interne | — | — | — | — | — | — | ✔ | — |
| Publier au public | — | — | — | — | — | — | ✔ | — |
| Archiver / supprimer (avec motif, conserve l'historique) | — | — | — | — | — | — | ✔ | — |
| Consulter l'historique des versions | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

`*` en l'absence du Lead. `**` validation technique interne au pays, distincte de la validation du Secrétariat/CP.

**Principe de versionning** : toute modification substantielle après commentaires/révision incrémente le numéro de version (v1.0 → v1.1 → v2.0 à la publication). Rien n'est supprimé silencieusement : une suppression déplace le document en archive avec motif, auteur et date, consultable dans l'historique.

---

## 3. Missions

| Action | Contributeur/Validateur | Admin pays | Lead GTT | Secrétariat | Comité de Pilotage |
|---|:---:|:---:|:---:|:---:|:---:|
| Consulter les missions de son GTT | ✔ | ✔ | ✔ | ✔ | ✔ |
| Proposer une mission | — | ✔ | ✔ | ✔ | — |
| Ajouter une note de suivi | — | — | ✔ | ✔ | — |
| Valider une mission (budget/dates) | — | — | — | ✔ | ✔* |
| Modifier le statut (en cours/terminée) | — | — | ✔ | ✔ | — |
| Rédiger le rapport de mission | — | — | ✔ | ✔ | — |

`*` pour les missions dépassant un seuil budgétaire à définir avec le client.

---

## 4. Comptes, utilisateurs, gouvernance

| Action | Admin pays | Lead GTT | Secrétariat | Coordinateur régional | Président/VP CP |
|---|:---:|:---:|:---:|:---:|:---:|
| Créer / modifier / supprimer un compte pays | — | — | ✔ | ✔ | — |
| Définir le rôle institutionnel d'un pays | — | — | ✔ | ✔ | — |
| Ajouter/modifier un utilisateur interne de son pays | ✔ | — | — | — | — |
| Désigner le Lead/Co-lead d'un GTT (personne nommée) | ✔* | — | — | — | — |
| Ajouter un collaborateur au Secrétariat | — | — | — | ✔ | — |
| Gérer la composition du Comité de Pilotage | — | — | ✔ | ✔ | — |
| Créer un accès expert externe ponctuel | — | — | ✔ | ✔ | — |

`*` uniquement pour les GTT où son propre pays détient effectivement ce rôle technique (Lead ou Co-lead), et uniquement parmi les utilisateurs de son pays.

---

## 5. Veille réglementaire, réclamations, contenu public

| Action | Interne (tous niveaux) | Secrétariat | Public |
|---|:---:|:---:|:---:|
| Consulter les alertes de veille | ✔ | ✔ | — |
| Notifier les régulateurs d'une alerte | — | ✔ | — |
| Déposer une réclamation | — | — | ✔ |
| Traiter une réclamation (statut) | — | ✔ | — |
| Éditer le contenu public (actualités, coordonnées, descriptions GTT) | — | ✔ | — |
| Consulter la bibliothèque publique | ✔ | ✔ | ✔ |
| Consulter les documents internes/confidentiels | selon visibilité et GTT | ✔ | — |

---

## 6. Notes pour l'implémentation back-end

- Modéliser comme **deux tables de rôles distinctes** : `user_country_level` (1 valeur) et `user_additional_roles` (0..n lignes, type: `twg_role` ou `steering_role`), plutôt qu'un seul champ "rôle" — cela reflète le cumul décrit en section 1.
- Le contrôle d'accès sur les documents doit croiser **trois critères** : le niveau d'accès de la personne, son(ses) GTT d'appartenance, et le statut/visibilité du document — pas seulement le rôle seul.
- Toute action de validation, révision ou suppression doit être **journalisée** (acteur, date, action, document/version concerné) — cette table d'audit existe déjà comme concept dans la maquette (Journal d'activité).