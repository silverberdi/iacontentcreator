import { postN8nJson } from "./n8nClient";
import type {
  CharacterOnboardingListResponse,
  CharacterOnboardingSavePayload,
  CharacterOnboardingSaveResponse,
} from "../types/characters";

export async function listCharacterOnboarding(): Promise<CharacterOnboardingListResponse> {
  return postN8nJson<CharacterOnboardingListResponse>("/admin/characters/list", {});
}

export async function saveCharacterOnboarding(
  payload: CharacterOnboardingSavePayload,
): Promise<CharacterOnboardingSaveResponse> {
  return postN8nJson<CharacterOnboardingSaveResponse>("/admin/characters/save", payload);
}
