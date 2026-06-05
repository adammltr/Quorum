# Security Policy

## Supported Versions

| Version | Security support |
|---|---|
| `main` (branch) | ✅ Yes |
| Other branches | ❌ No |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

### How to report

Email **adammolitor2008@gmail.com** with:

- **Subject**: `[SECURITY] Quorum — [short description]`
- A **description** of the vulnerability (type, affected component)
- **Steps to reproduce** (a proof of concept if possible)
- The **potential impact** (data exposed, users affected, etc.)
- **Your contact details** if you want to be credited in the fix (optional)

### What happens next

1. **Acknowledgement within 48h** (often sooner).
2. **Assessment**: we confirm the vulnerability and evaluate its severity.
3. **Fix**: a patch is developed, generally in private.
4. **Coordinated disclosure**: we keep you informed before the fix is published.
5. **Credit**: your name in the fix's changelog (if you wish).

### Disclosure timeline

We aim to ship a fix within a reasonable timeframe based on severity:

| Severity | Target timeline |
|---|---|
| Critical (CVSS ≥ 9) | 7 days |
| High (CVSS 7–8.9) | 14 days |
| Medium (CVSS 4–6.9) | 30 days |
| Low (CVSS < 4) | 90 days |

## Scope (in scope)

- The Quorum web application (React frontend + Supabase Edge Functions)
- User API key management (BYOK)
- Authentication and sessions
- User data stored in Supabase
- Docker images or deployment scripts, if published

## Out of scope

- Third-party services (OpenRouter, Supabase, Vercel) — report to them directly
- Attacks requiring physical access to the machine
- Social engineering
- Purely theoretical reports without a proof of concept or demonstrable impact

## Thanks

The security of an open source app relies on its community. Thank you for taking the time to report responsibly.
