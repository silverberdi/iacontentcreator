# Product Backlog

## Purpose

This backlog organizes the work required to turn the Avatares AI project into an operator-friendly, semi-autonomous avatar production platform.

The backlog is structured by epics and waves. Each wave should produce an operationally useful increment, not just isolated technical changes.

## Backlog Format

Each user story should follow this structure:

```text
US-### — Title
Status: Backlog | Ready | In Progress | Blocked | Review | Done
Priority: P0 | P1 | P2 | P3
Epic: ...
Wave: ...

User Story:
As a ...
I want ...
So that ...

Acceptance Criteria:
- [ ] ...

Technical Tasks:
- [ ] ...

Dependencies:
- ...

Notes:
- ...
```

## Priorities

| Priority | Meaning |
|---|---|
| P0 | Required to operate the MVP safely and coherently. |
| P1 | Important for reliability, scale, or operator efficiency. |
| P2 | Useful enhancement after the core workflow works. |
| P3 | Future experiment or optional capability. |

## Statuses

| Status | Meaning |
|---|---|
| Backlog | Captured but not ready to implement. |
| Ready | Clear enough to start. |
| In Progress | Actively being implemented. |
| Blocked | Cannot continue without a decision, dependency, or external setup. |
| Review | Implemented and awaiting validation. |
| Done | Implemented, validated, and usable. |

## Epics

### EPIC-01 — Publications

Build the operator-facing workflow for creating, reviewing, packaging, and eventually publishing avatar content.

Current focus:

```text
Estefanía Montealegre as influencer-brand avatar.
```

### EPIC-02 — Character Profiles

Convert avatar documentation into structured, versioned, machine-usable profiles that can guide prompts, captions, reviews, and automation rules.

### EPIC-03 — Asset Review

Make asset review reliable, simple, and aligned with the production pipeline.

### EPIC-04 — Admin Operations

Make the system operable without direct access to n8n, Docker, MinIO, Postgres, or SSH for routine work.

### EPIC-05 — Workflow and Repo Sync

Treat n8n workflows, schemas, docs, and deployment expectations as versioned assets in the repo.

### EPIC-06 — AI Provider Router

Create a clean way to route tasks to DeepSeek, Gemini, Comfy Cloud, local models, and future providers.

### EPIC-07 — Voice Pipeline

Add audio generation as a reviewed asset type and production workflow.

### EPIC-08 — Didi GFE Productization

Define and later implement the GFE/direct monetization pipeline for Didi Duarte after safety, consent, monetization, and platform rules are defined.

### EPIC-09 — Security and Access

Maintain secure access, role separation, approval workflows, and safe exposure of internal services.

## Waves

| Wave | Focus | Goal |
|---|---|---|
| Wave 1 | Estefanía Publications MVP | Finish the end-to-end public influencer content workflow. |
| Wave 2 | Character Profiles | Make avatar canon structured and usable by automation. |
| Wave 3 | Admin Operations | Make day-to-day operations visible and recoverable from the console. |
| Wave 4 | Voice Lab | Add reviewed local/cloud voice generation experiments. |
| Wave 5 | Didi GFE Readiness | Define and implement safe premium-content workflows. |

## Wave 1 Definition

Wave 1 is complete when an operator can create and package an Estefanía publication from the console without touching n8n, Comfy Cloud, MinIO, Postgres, Docker, or SSH.

See:

```text
planning/backlog/WAVE-01-estefania-publications.md
```

