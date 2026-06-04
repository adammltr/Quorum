# Contributing to Quorum

Thanks for your interest. This guide covers everything you need to contribute properly.

---

## Prerequisites

- **Node.js** ≥ 20 LTS
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Supabase CLI** (`npm install -g supabase`)
- **gitleaks** (see the Security section below)
- An [OpenRouter](https://openrouter.ai/) account (free) and a [Supabase](https://supabase.com/) account (free)

---

## Local setup

```bash
git clone https://github.com/adammltr/Quorum.git
cd Quorum

# Copy the environment variables
cp .env.example .env.local
# Edit .env.local with your real keys (see comments in .env.example)

# Install dependencies
pnpm install

# Start Supabase locally (Docker required)
supabase start

# Start the dev server
pnpm dev
```

---

## Contribution workflow

1. **Fork** the repo and create a branch off `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/my-bug
   ```

2. **Read `docs/SPEC.md` and `docs/DESIGN.md`** before writing anything user-visible.

3. **Write code**, following the rules in `CLAUDE.md`.

4. Before pushing, check the frontend (from the repo root):
   ```bash
   pnpm typecheck   # zero TypeScript errors (tsc -b --noEmit)
   pnpm lint        # zero ESLint errors
   pnpm build       # production build with no errors (tsc -b && vite build)
   ```

   And, if you touched the Edge Functions, from `supabase/functions/`:
   ```bash
   deno task check  # type-check council/index.ts
   deno task lint   # deno lint
   deno task test   # Deno tests (_tests/)
   ```

5. Open a **Pull Request** against `main` with a clear description (what / why / how to test).

---

## Commit convention

Format: `type: short description`

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependencies |
| `docs` | Documentation only |
| `style` | Formatting, pure CSS |
| `refactor` | Refactoring with no behavior change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

Examples:
```
feat: add anonymized peer-review (stage 2)
fix: handle timeout on :free models
docs: update the BYOK spec
```

---

## Security — Secret-leak prevention with gitleaks

Quorum uses [gitleaks](https://github.com/gitleaks/gitleaks) to **block any commit containing a secret** (API key, token, password).

### 1. Install gitleaks

**macOS**:
```bash
brew install gitleaks
```

**Windows** (Scoop):
```bash
scoop install gitleaks
```

**Linux**:
```bash
# Via the GitHub Releases binary
curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar -xz
sudo mv gitleaks /usr/local/bin/
```

**Verify the installation**:
```bash
gitleaks version
```

### 2. Enable the pre-commit hook

After `git clone`, configure git to use the repo's hooks:

```bash
git config core.hooksPath .githooks
```

⚠️ **Run this command once** after each `git clone`. It points git at `.githooks/pre-commit`, which runs gitleaks before every commit.

### 3. Test the hook

```bash
# Run a scan without committing
gitleaks detect --config .gitleaks.toml --source . --verbose
```

If gitleaks finds a secret, it prints the offending line and **blocks the commit**. Remove the secret, use an environment variable instead, and commit again.

### 4. The hook also runs in GitHub Actions

Every push triggers `.github/workflows/gitleaks.yml`, which scans the full history. A secret pushed by accident will be detected and the run will fail — **revoke the key immediately** if that happens.

---

## Tests

The current tests cover the Edge Functions logic (peer-review parsing, Borda
aggregation). They run with Deno, from `supabase/functions/`:

```bash
cd supabase/functions
deno task test     # runs _tests/ (e.g. ranking_test.ts)
```

> There is no frontend suite (vitest) or e2e suite (playwright) yet — it's on
> the backlog (see the README roadmap). Contributions on this front are
> welcome.

---

## Reporting a security vulnerability

See [SECURITY.md](SECURITY.md).
