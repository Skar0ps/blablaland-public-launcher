# Launcher Blablaland (Public)

Launcher basé sur Electron permettant de jouer à Blablaland (ou tout autre jeu flash présent sur un site web).

Basé à l'origine sur le launcher de [Panfu](https://github.com/teampanfu/panfu-desktop).

## Prérequis

*   [Node.js](https://nodejs.org/) (Version LTS recommandée)
*   [Yarn](https://yarnpkg.com/) (`npm install -g yarn`)

## Installation et Configuration

1.  Clonez ce repo.
2.  Installez les dépendances :
    ```bash
    yarn install
    ```

## Développement

Pour lancer l'application en mode développement (+ outils de debug activés) :

```bash
yarn start
```

Pour compiler une version Windows local :

```bash
yarn dist
```

## Intégration Continue (GitHub Actions)

Ce projet utilise GitHub Actions pour compiler automatiquement les installateurs pour toutes les plateformes dans le cloud. C'est indispensable si vous n'avez pas de machine macOS, car Apple ne permet pas de compiler pour macOS en dehors d'un environnement Apple.

La configuration se trouve dans `.github/workflows/main.yml`.

### Première configuration

**Aucune configuration particulière n'est nécessaire.** GitHub Actions a accès à votre repo automatiquement via son token intégré (`GITHUB_TOKEN`). Il suffit que le fichier `.github/workflows/main.yml` soit présent dans le repo.

### Procédure de Release

Pour générer les installateurs d'une nouvelle version :

1.  Assurez-vous que tout votre code est commit et pushed.
2.  Créez un tag correspondant à la version (exemple : `v1.0.0`) :
    ```bash
    git tag v1.0.0
    ```
3.  Envoyez le tag sur GitHub :
    ```bash
    git push origin v1.0.0
    ```

GitHub Actions détectera le tag, lancera les machines virtuelles et compilera l'application. Les fichiers seront disponibles dans l'onglet **Actions** de votre repo GitHub, sous la section **Artifacts** du workflow correspondant.

### Fichiers générés

| Plateforme | Artifact GitHub Actions | Formats |
|---|---|---|
| **Windows** | `release-builds-windows` | `.exe` (installateur NSIS) + `.exe` (portable) en x64 et x86 |
| **Linux** | `release-builds-linux` | `.AppImage`, `.deb`, `.rpm` en x64 |
| **macOS** | `release-builds-macos` | `.dmg` + `.zip` en Intel (x64) et Apple Silicon (arm64) |


## Instances multiples en parallèle

Si vous basez plusieurs launchers sur ce repo (ex : un pour "Blablaconv" et un pour "Blablavard"),
chaque launcher doit avoir un `productName` et un `appId` **uniques**, sinon le second launcher
se fermera immédiatement en croyant qu'une instance est déjà en cours d'exécution.

Dans **`package.json`** :
```json
"productName": "Blablaconv Launcher"
```

Dans **`electron-builder.yml`** :
```yaml
appId: "com.blablaconv.desktop"
```