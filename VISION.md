# Vision

*Actively developed, solo. Last shipped: structured Chairman verdicts (June 2026).*

## The thesis

A single language model is a confident narrator with no editor. It cannot tell you where it is weakest, because the same process that produced the answer produced the certainty around it. The conviction behind Quorum is narrow: **the only thing that reliably audits a model is another model that disagrees with it.** Agreement between independent reasoners is a strong prior. Disagreement is not failure — it is a map of exactly where a question is still hard. Most tools hide that map behind one voice. Quorum draws it.

## Where we are

- ✅ Parallel streaming, blind peer-review, Chairman verdict — live and deployed
- ✅ Structured verdicts — convergence, the sharpest disagreement, and a verdict that picks a side
- ✅ Question of the Day, custom councils, history, collections
- ✅ BYOK — personal keys encrypted server-side (AES-256-GCM), never in the browser
- ✅ Shareable public result pages with dynamic OG images
- ⬜ Real payments — billing is abstracted and scaffolded, no provider wired yet
- ⬜ Frontend + e2e tests and full CI (today only the Deno engine is covered)

## What's next

**Q3 2026**
- Wire a Merchant of Record (Lemon Squeezy / Polar) for the first real PRO checkout
- Vitest + Playwright running on every PR
- A second aggregation method beyond Borda, so consensus isn't tied to one voting rule

**Q4 2026**
- PWA with offline access to your history
- Markdown and PDF export of verdicts
- Fewer steps from `git clone` to a running self-host

## On open source

Quorum is AGPL-3.0, network-copyleft clause included. That is deliberate. The deliberation engine *is* the project, so a hosted fork should have to share its source the same way I do. The line is open-core, not open-bait: everything that makes the council work — fan-out, blind review, Borda aggregation, the Chairman — is in this repo and self-hostable today. The paid tier sells hosted convenience and unlimited history, never access to the protocol. If the cloud version vanished tomorrow, you would lose nothing that matters.

## Contributing

It is early. The architecture is stable but the surface still moves, so an issue before a large PR saves time on both sides. Setup, the exact `typecheck / lint / build / test` commands, and commit conventions live in [CONTRIBUTING.md](CONTRIBUTING.md).
