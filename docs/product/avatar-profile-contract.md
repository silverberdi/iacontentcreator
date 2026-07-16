# Avatar Profile Contract

## Purpose

This contract defines the shared operating shape for every avatar in the project.

It does not replace all character canon documents. It creates a single human-readable profile that can later become `profile.json` and `avatar-profile.schema.json`.

Markdown remains useful for deep canon, visual exploration, lore, and editorial notes. The profile contract is the bridge between that canon and the systems that need structured decisions: n8n, the console, Comfy workflows, MinIO asset policy, prompt generation, publishing, and review.

## Contract Principle

All avatars share the same core sections.

Each avatar type may add specialized sections.

```text
same skeleton
different business modules
```

This avoids two bad outcomes:

- every avatar becoming an incompatible one-off;
- every avatar being forced into the same business model.

## Recommended Files

Each avatar should eventually have:

```text
avatars/<avatar-slug>/profile-contract.md
avatars/<avatar-slug>/profile.json
```

The first file is the human working contract. The second file is the machine-readable operational contract.

## Common Required Sections

### 1. Profile Metadata

Purpose: identify the avatar and its operating category.

Fields:

- `avatarSlug`
- `displayName`
- `publicName`
- `aliases`
- `avatarType`
- `businessProfile`
- `primaryLanguage`
- `secondaryLanguages`
- `profileStatus`
- `ownerMode`

Allowed `avatarType` examples:

- `influencer-ai`
- `gfe`
- `bfe`
- `authority`
- `personal-brand`
- `fictional-character`

Allowed `businessProfile` examples:

- `influencer-brand`
- `gfe-direct-monetization`
- `bfe-direct-monetization`
- `authority-business`
- `personal-authority`
- `experimental`

### 2. Business Intent

Purpose: define why this avatar exists commercially.

Required:

- primary business objective
- monetization path
- target customer or audience
- success signals
- explicit non-goals

This section should answer:

```text
What is this avatar trying to make possible?
```

### 3. Audience And Relationship Model

Purpose: define who the avatar speaks to and what type of relationship is being simulated or built.

Required:

- primary audience
- secondary audience
- emotional promise
- relationship style
- expected audience behavior
- retention or engagement logic

Examples:

- Estefania builds brand-safe lifestyle affinity.
- Didi builds recurring emotional attachment for fan monetization.
- Andres builds romantic calm and BFE continuity.
- Donovan builds executive trust and technical authority.
- Silverio builds real-world professional authority.

### 4. Identity Canon

Purpose: capture the irreducible identity rules.

Required:

- core identity
- apparent profession or role
- geography
- lifestyle baseline
- personality traits
- emotional perception
- archetype
- continuity rules
- identity break rules

This section should be short and operational. Longer canon can stay in supporting documents.

### 5. Visual Identity

Purpose: define what must remain stable across images and video.

Required:

- face and expression rules
- body and posture rules
- hair, skin, eyes, styling
- wardrobe system
- environments
- camera language
- visual do-not-break rules
- negative visual directions

This section should be usable by prompt generation and asset review.

### 6. Voice And Language

Purpose: define how the avatar sounds.

Required:

- languages
- tone
- vocabulary
- caption style
- conversation style
- humor style
- forbidden voice patterns
- example lines

For authority avatars, this should include epistemic stance and source discipline.

For GFE/BFE avatars, this should include intimacy boundaries and emotional pacing.

### 7. Content System

Purpose: define what the avatar publishes or produces.

Required:

- content pillars
- recurring formats
- platform fit
- scene types
- cadence assumptions
- content that should never be produced
- review requirements

This section should drive prompt packs, briefs, and the publication console.

### 8. Platform Strategy

Purpose: define where the avatar operates and why.

Required:

- primary platforms
- secondary platforms
- platform-specific rules
- publishing status
- monetization status
- content adaptation rules

Examples:

- Instagram for Estefania lifestyle validation.
- Fansly for Didi monetization, after safety rules exist.
- LinkedIn, blog, or podcast for authority profiles.

### 9. Safety Boundaries

Purpose: define what the system must block, review, or avoid.

Required:

- prohibited content
- claims policy
- intimacy or sexuality limits
- consent and age-gating requirements
- dependency risk rules
- human review triggers
- automation limits

This section is mandatory for every avatar, not only GFE/BFE.

### 10. Operations Contract

Purpose: define how the avatar is operated.

Required:

- active workflows
- required catalogs
- asset type defaults
- status model
- canonical asset policy
- prompt generation inputs
- review flow
- approval flow
- publishing flow
- backup or recovery expectations

This section connects the character to n8n, MinIO, Comfy, and the console.

### 11. Metrics And Feedback

Purpose: define how success or failure is measured.

Required:

- traction metrics
- quality metrics
- risk metrics
- business metrics
- manual review signals

### 12. Open Questions

Purpose: prevent unclear assumptions from becoming hidden system behavior.

Required:

- unresolved business decisions
- unresolved safety decisions
- unresolved visual decisions
- unresolved platform decisions
- unresolved automation decisions

Open questions are allowed. Invisible ambiguity is not.

## Type-Specific Modules

### Influencer AI Module

Use for avatars like Estefania.

Add:

- brand fit
- poor brand fit
- commercial tone
- soft placement rules
- partnership package ideas
- lifestyle aspiration level
- brand safety rules
- public recognizability goals

### GFE Module

Use for avatars like Didi.

Add:

- allowed explicitness level
- platform monetization model
- subscription tiers
- PPV categories
- DM rules
- memory rules
- emotional dependency safeguards
- proactive message rules
- human review requirements
- age-gating requirements

### BFE Module

Use for avatars like Andres.

Add:

- romantic promise
- emotional pacing
- companionship boundaries
- sensuality limits
- dependency safeguards
- relationship continuity rules
- private interaction rules
- monetization model

### Authority Module

Use for avatars like Donovan and Silverio.

Add:

- domain territory
- source discipline
- editorial doctrine
- credibility rules
- claim standards
- research intake
- insight generation model
- publication channels
- offer or business backend

### Personal Brand Module

Use for real-person public authority profiles like Silverio.

Add:

- factual constraints
- reputation risk rules
- professional claims policy
- personal disclosure boundaries
- public-building rules
- separation between real person and AI assistance

## Migration Path

### Step 1: Human Contract

Create `profile-contract.md` for each active avatar.

### Step 2: Machine Draft

Create `profile.draft.json` from the Markdown contract.

### Step 3: Schema

Create `schemas/avatar-profile.schema.json` only after at least two different avatar types have working profile drafts.

Recommended first pair:

- Estefania: `influencer-brand`
- Didi or Andres: `direct-emotional-monetization`

This ensures the schema does not become biased toward influencer workflows only.

### Step 4: System Integration

Use the JSON profile in:

- n8n brief generation
- prompt pack generation
- console profile summary
- catalog validation
- safety checks
- publication workflows

## Non-Goals

This contract does not require deleting existing Markdown files.

This contract does not require all avatars to have equal depth.

This contract does not force all avatar types into the same monetization strategy.

This contract does not make JSON the only place where creative canon can live.

