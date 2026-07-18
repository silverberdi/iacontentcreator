export type AvatarProfileSummary = {
  avatarSlug: string;
  displayName: string;
  businessProfile: string;
  primaryObjective: string;
  contentPillars: string[];
  brandFit: string[];
  captionTone: string[];
  visualPriorities: string[];
  safetyReviewTriggers: string[];
  primaryPlatform: {
    platform: string;
    handle: string;
    url: string;
    publishingMode: string;
    status: string;
  };
};

export const avatarProfileSummaries: Record<string, AvatarProfileSummary> = {
  "estefania-montealegre": {
    avatarSlug: "estefania-montealegre",
    displayName: "Estefania Montealegre",
    businessProfile: "influencer-brand",
    primaryObjective:
      "Generate organic lifestyle content that builds audience affinity and attracts brand collaborations.",
    contentPillars: ["lifestyle", "travel", "wellness", "social life", "personal thoughts"],
    brandFit: ["coffee", "travel", "wellness", "casual elegant fashion", "urban lifestyle", "music"],
    captionTone: ["casual", "warm", "intelligent", "spontaneous", "lightly reflective"],
    visualPriorities: ["identity consistency", "emotional realism", "recognizability", "believable humanity"],
    safetyReviewTriggers: [
      "sponsored content",
      "wellness or skincare claims",
      "identity changes",
      "strong sensual framing",
      "public posts",
    ],
    primaryPlatform: {
      platform: "instagram",
      handle: "@estefaniamontealegre.ai",
      url: "https://www.instagram.com/estefaniamontealegre.ai/",
      publishingMode: "manual-assisted",
      status: "active",
    },
  },
};
