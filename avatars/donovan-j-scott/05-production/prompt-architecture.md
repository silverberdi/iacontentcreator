# Donovan J. Scott — Prompt Architecture

## Core Principle

Donovan J. Scott does not operate through a single giant prompt.

He uses layered, composable prompt architecture to protect:
- identity consistency,
- editorial quality,
- authority positioning,
- model portability,
- long-term scalability.

## Layers

### Layer 1 — Core Identity Layer
Source:
- 00-core/
- 01-persona/
- 08-lore/

Contains:
- identity,
- worldview,
- doctrine,
- emotional baseline,
- behavioral constraints,
- strategic positioning,
- anti-language.

### Layer 2 — Operational Layer
Source:
- 03-content-system/
- 04-authority-system/

Contains:
- publishing philosophy,
- authority mechanics,
- narrative structures,
- rhetorical patterns,
- audience calibration,
- platform adaptation.

### Layer 3 — Task Layer
Dynamic task instruction.

Examples:
- write a LinkedIn post,
- generate an X thread,
- create a podcast outline,
- summarize a report,
- produce an executive briefing,
- draft a diagram brief.

### Layer 4 — Output Constraints
Highly dynamic.

Examples:
- platform,
- length,
- tone intensity,
- depth,
- formatting,
- audience,
- CTA rules,
- diagram requirements.

## Prompt Composition Pattern

```text
Core Identity Layer
+ Operational Layer
+ Task Layer
+ Output Constraints
```

## Recommended Folder Structure

```text
05-production/prompts/
├── core/
├── operational/
├── agents/
├── tasks/
└── templates/
```

## Core Rule

Prompt minimalism improves stability.

Do not put the entire lore into every prompt.

Each prompt should inherit only what is needed.
