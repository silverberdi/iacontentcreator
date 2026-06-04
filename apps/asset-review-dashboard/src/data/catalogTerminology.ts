/** UI-only labels — stable catalog values (slugs) are unchanged. */

export const WORKFLOW_CATALOG = {
  title: "Workflows",
  slugLabel: "workflow (slug)",
  displayNamePlaceholder: "e.g. Flux Krea Dev",
  descriptionPlaceholder: "Comfy/n8n generation template or pipeline (e.g. flux-krea-dev, z-image-turbo)",
  fieldLabel: "Workflow",
  fieldHint:
    "Generation template/pipeline used in Comfy or n8n — not the checkpoint file itself.",
  examples: "flux-krea-dev, flux-dev-uso-reference, z-image-turbo",
} as const;

export const MODEL_CATALOG = {
  title: "Models",
  slugLabel: "model (slug)",
  displayNamePlaceholder: "e.g. Flux Krea Dev",
  descriptionPlaceholder: "Base checkpoint/model used by a workflow (e.g. flux1-dev, flux-krea-dev)",
  fieldLabel: "Model",
  fieldHint: "Base generation model/checkpoint that a workflow runs.",
  examples: "flux1-dev, flux-krea-dev, z-image-turbo-bf16",
  providerHint: "Provider or runtime (e.g. comfy, replicate)",
} as const;
