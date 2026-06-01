# Contribuer à Quorum

Merci de l'intérêt. Ce guide couvre tout ce qu'il faut pour contribuer correctement.

---

## Prérequis

- **Node.js** ≥ 20 LTS
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Supabase CLI** (`npm install -g supabase`)
- **gitleaks** (voir section Sécurité ci-dessous)
- Un compte [OpenRouter](https://openrouter.ai/) (gratuit) et un compte [Supabase](https://supabase.com/) (gratuit)

---

## Installation locale

```bash
git clone https://github.com/[org]/quorum.git
cd quorum

# Copie les variables d'environnement
cp .env.example .env.local
# Édite .env.local avec tes vraies clés (voir commentaires dans .env.example)

# Installe les dépendances
pnpm install

# Lance Supabase en local (Docker requis)
supabase start

# Lance le dev server
pnpm dev
```

---

## Workflow de contribution

1. **Fork** le repo et crée une branche depuis `main` :
   ```bash
   git checkout -b feat/ma-feature
   # ou
   git checkout -b fix/mon-bug
   ```

2. **Lis `docs/SPEC.md` et `docs/DESIGN.md`** avant de coder quoi que ce soit de visible.

3. **Code**, en respectant les règles de `CLAUDE.md`.

4. Avant de pousser, vérifie :
   ```bash
   pnpm typecheck   # zéro erreur TypeScript
   pnpm lint        # zéro erreur ESLint
   pnpm build       # build prod sans erreur
   ```

5. Ouvre une **Pull Request** vers `main` avec une description claire (quoi / pourquoi / comment tester).

---

## Convention de commits

Format : `type: description courte en français`

| Type | Usage |
|---|---|
| `feat` | Nouvelle feature |
| `fix` | Correction de bug |
| `chore` | Maintenance, dépendances |
| `docs` | Documentation uniquement |
| `style` | Formatage, CSS pur |
| `refactor` | Refactoring sans changement de comportement |
| `test` | Ajout ou correction de tests |
| `perf` | Amélioration de performance |

Exemples :
```
feat: ajout du peer-review anonymisé (stage 2)
fix: correction du timeout sur les modèles :free
docs: mise à jour de la spec BYOK
```

---

## Sécurité — Anti-leak de secrets avec gitleaks

Quorum utilise [gitleaks](https://github.com/gitleaks/gitleaks) pour **bloquer tout commit contenant un secret** (clé API, token, mot de passe).

### 1. Installer gitleaks

**macOS** :
```bash
brew install gitleaks
```

**Windows** (Scoop) :
```bash
scoop install gitleaks
```

**Linux** :
```bash
# Via le binaire GitHub Releases
curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar -xz
sudo mv gitleaks /usr/local/bin/
```

**Vérifier l'installation** :
```bash
gitleaks version
```

### 2. Activer le hook pre-commit

Après `git clone`, configure git pour utiliser les hooks du repo :

```bash
git config core.hooksPath .githooks
```

⚠️ **Cette commande est à faire une seule fois** après chaque `git clone`. Elle pointe git vers `.githooks/pre-commit` qui lance gitleaks avant chaque commit.

### 3. Tester le hook

```bash
# Simule un scan sans commiter
gitleaks detect --config .gitleaks.toml --source . --verbose
```

Si gitleaks trouve un secret, il affiche la ligne concernée et **bloque le commit**. Retire le secret, utilise une variable d'environnement à la place, et recommite.

### 4. Le hook est aussi dans GitHub Actions

Chaque push déclenche `.github/workflows/gitleaks.yml` qui scanne l'historique complet. Un secret poussé par accident sera détecté et le run échouera — **revoke la clé immédiatement** si ça arrive.

---

## Tests

```bash
pnpm test          # vitest en mode watch
pnpm test:run      # vitest une seule fois
pnpm test:e2e      # playwright (requiert `pnpm dev` en parallèle)
```

---

## Signaler une faille de sécurité

Voir [SECURITY.md](SECURITY.md).
