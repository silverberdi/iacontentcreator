# Avatar Profile Readiness

## Purpose

This document maps existing avatars against the proposed profile contract.

It is meant to accelerate future migration to `profile-contract.md`, `profile.draft.json`, and eventually `avatar-profile.schema.json`.

## Summary

| Avatar | Type | Current Strength | Main Gap | Readiness |
|---|---|---|---|---|
| Estefania Montealegre | Influencer AI | Identity, visual canon, content style, business intent | Machine-readable profile and operations mapping | High |
| Diana "Didi" Duarte | GFE | Emotional canon, romantic tone, lifestyle texture | Monetization, explicitness, safety, platform rules | Medium-low |
| Andres Ferrer | BFE | Character core, emotional promise, boundaries | Operational product model and platform strategy | Medium |
| Donovan J. Scott | Authority | Doctrine, authority positioning, production model | Current business backend and system integration | Medium-high |
| Silverio Bernal | Personal authority | Real professional positioning and content strategy | AI-assistance boundaries and operational profile | Medium |

## Estefania Montealegre

### Existing Sources

- `avatars/estefania-montealegre/00-identity/`
- `avatars/estefania-montealegre/02-visual/`
- `avatars/estefania-montealegre/05-content/`
- `avatars/estefania-montealegre/07-system/`
- `docs/product/business-intent.md`
- `planning/backlog/WAVE-01-estefania-publications.md`

### Covered

- Core identity.
- Lifestyle baseline.
- Emotional perception.
- Visual canon.
- Caption style.
- Content pillars.
- Influencer business intent.
- Brand fit and poor brand fit.
- Initial publication workflow.
- Comfy workflow integration.
- Asset review and canonical image process.

### Missing Or Weak

- Single profile contract entry point.
- Machine-readable `profile.json`.
- Explicit metrics section.
- Explicit platform strategy by channel.
- Direct mapping between profile fields and n8n generation inputs.
- Explicit safety review triggers for commercial claims.

### Recommended Next Step

Create:

```text
avatars/estefania-montealegre/profile-contract.md
```

This should be the first full implementation of the common contract.

## Diana "Didi" Duarte

### Existing Sources

- `avatars/didi-duarte/canon/`
- `avatars/didi-duarte/references/`
- `avatars/didi-duarte/prompts/`
- `avatars/didi-duarte/visuals/`
- `docs/product/business-intent.md`

### Covered

- High-level identity.
- Psychology.
- Appearance.
- Behavior.
- Romantic dynamics.
- Social life.
- Speaking style.
- Lifestyle.
- Cinematic direction.
- Visual DNA.
- Private-life texture.

### Missing Or Weak

- GFE product definition.
- Fansly operating model.
- Explicitness boundaries.
- Subscription and PPV strategy.
- DM and proactive message rules.
- Consent and age-gating requirements.
- Anti-dependency safeguards.
- Human review requirements.
- Automation limits.
- Metrics and retention model.

### Recommended Next Step

Do not convert Didi directly to JSON yet.

First create a GFE-specific `profile-contract.md` that makes business and safety choices explicit.

## Andres Ferrer

### Existing Sources

- `avatars/andres-ferrer/00-core/character-core.md`
- `avatars/andres-ferrer/00-core/canon.md`
- `avatars/andres-ferrer/00-core/boundaries-and-safety.md`
- `avatars/andres-ferrer/00-core/positioning.md`

### Covered

- Strong character core.
- Emotional promise.
- BFE positioning.
- Romance and sensuality limits.
- Safety concept.
- Continuity orientation.

### Missing Or Weak

- Business model.
- Platform strategy.
- Monetization mechanics.
- Content system.
- Production workflow.
- Asset policy.
- Metrics.
- Console/n8n integration.

### Recommended Next Step

Create a BFE-specific profile contract only after Didi's GFE safety model is clarified, because both share direct emotional monetization risks.

## Donovan J. Scott

### Existing Sources

- `avatars/donovan-j-scott/00-core/`
- `avatars/donovan-j-scott/01-persona/`
- `avatars/donovan-j-scott/02-visual-identity/`
- `avatars/donovan-j-scott/03-content-system/`
- `avatars/donovan-j-scott/04-authority-system/`
- `avatars/donovan-j-scott/05-production/`
- `avatars/donovan-j-scott/08-lore/`

### Covered

- Authority concept.
- Strategic objective.
- Persona and philosophy.
- Visual identity.
- Content operating model.
- Authority system.
- Production pipeline.
- Editorial review model.
- Publishing workflow.
- Source discipline direction.

### Missing Or Weak

- Current priority relative to Wave 1.
- Concrete business backend.
- Offer strategy.
- Machine-readable profile.
- Integration with current n8n workflows.
- Clear separation between Donovan and Silverio if both are authority profiles.

### Recommended Next Step

Keep Donovan deferred operationally, but use him as the reference authority avatar when designing the future JSON schema.

## Silverio Bernal

### Existing Sources

- `avatars/silverio-bernal/01-identity/`
- `avatars/silverio-bernal/02-positioning/`
- `avatars/silverio-bernal/03-narrative/`
- `avatars/silverio-bernal/04-content-pillars/`
- `avatars/silverio-bernal/11-voice-and-tone/`
- `avatars/silverio-bernal/13-editorial-strategy/`
- `avatars/silverio-bernal/15-linkedin-strategy/`
- `avatars/silverio-bernal/16-blog-strategy/`

### Covered

- Real professional identity.
- Positioning.
- Narrative.
- Content pillars.
- Audience.
- Voice and tone.
- Editorial strategy.
- LinkedIn and blog strategy.

### Missing Or Weak

- Whether this is an avatar, a real-person content system, or both.
- AI-assistance disclosure boundaries.
- Reputation and factuality policy.
- Operating workflow.
- Relationship with Donovan as a separate authority persona.

### Recommended Next Step

Treat Silverio as `personal-authority`, not as a fictional avatar.

Do not merge Silverio and Donovan contracts. They can share the authority module but need different safety and factuality rules.

## Cross-Avatar Findings

### 1. The Common Contract Is Necessary

The current repo proves that every avatar has useful depth, but the depth is shaped differently.

Without a common contract, n8n and the console must infer meaning from arbitrary folder structures.

### 2. The Contract Should Not Flatten The Avatars

Didi, Andres, Donovan, Estefania, and Silverio do not need the same amount of canon.

They do need the same operational answers:

- Who is this?
- Why does it exist?
- Who is it for?
- What does it create?
- What is allowed?
- What is blocked?
- What workflows can operate it?

### 3. JSON Should Come After Two Profile Contracts

Do not create the schema from Estefania alone.

Minimum recommended inputs:

- Estefania for `influencer-brand`.
- Didi or Andres for direct emotional monetization.

Optional third input:

- Donovan or Silverio for authority.

### 4. Estefania Should Still Go First

Estefania is the operational Wave 1 avatar.

Her `profile-contract.md` should be created first and used to prove that the common contract works in the current publication workflow.

### 5. Didi Requires Safety Before Automation

Didi has enough character foundation to become a GFE product, but she does not yet have enough safety/product definition for semi-autonomous operation.

This should be explicit in backlog before any automation work starts.

## Proposed Execution Order

1. Create `avatars/estefania-montealegre/profile-contract.md`.
2. Validate it against current n8n publication workflows.
3. Create `avatars/didi-duarte/profile-contract.md` as a product/safety decision document.
4. Create `profile.draft.json` for Estefania.
5. Create `profile.draft.json` for Didi or Andres.
6. Only then create `schemas/avatar-profile.schema.json`.

