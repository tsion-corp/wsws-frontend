---
date: 2026-10-01
feature: Staging brought level with production, keeping Checkers
scope: chore
scenario-impact: none
---

# Staging, level with production

Staging had fallen 88 commits behind `main` (and carried 163 of its own,
most of them earlier versions of work that later reached `main` through
other commits), so a merge would have been a long fight between
duplicated-but-different history. This commit instead puts `main`'s exact
tree (`47a0e3d9`, #603) on top of staging's history, so staging is what
production is, including the Decane migration, hermetic fonts, the Ark ID
display name, the campaign modal and the read-pool fix.

One thing staging keeps that production does not: **Checkers**. #582 took
it off production; that commit is reversed here, so the catalogue entry,
the seven routes, the dashboard card and the live-feed arm are back on
staging exactly as they were.

Backends for the staging deployment (wsws-test, which builds this branch):
every service that answers on `staging.tsionark.com` stays there; the
three that do not (`earn`, `notification`, `prediction-market`) are pointed
at production through their per-service overrides, which is what those
overrides exist for.
