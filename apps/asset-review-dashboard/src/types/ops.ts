export type AiGatewayHealthResponse = {
  ok?: boolean;
  service?: string;
  error?: string;
  upstreamStatus?: number;
  providers?: {
    deepseek?: {
      configured?: boolean;
      model?: string | null;
    };
    comfyCloud?: {
      configured?: boolean;
      baseUrl?: string | null;
      estefaniaTemplate?: boolean;
      downloadOutput?: boolean;
    };
    visualQa?: {
      provider?: string | null;
      configured?: boolean;
      baseUrl?: string | null;
      localUrl?: string | null;
      model?: string | null;
    };
    avatarProfiles?: {
      root?: string;
      estefania?: boolean;
    };
  };
};
