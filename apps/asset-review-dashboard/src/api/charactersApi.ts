import { postN8nJson } from "./n8nClient";
import type {
  CharacterReferenceRegisterPayload,
  CharacterReferenceRegisterResponse,
  CharacterReferencesListPayload,
  CharacterReferencesListResponse,
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

export async function listCharacterReferences(
  payload: CharacterReferencesListPayload,
): Promise<CharacterReferencesListResponse> {
  return postN8nJson<CharacterReferencesListResponse>(
    "/admin/characters/references/list",
    payload,
  );
}

export async function registerCharacterReference(
  payload: CharacterReferenceRegisterPayload,
): Promise<CharacterReferenceRegisterResponse> {
  return postN8nJson<CharacterReferenceRegisterResponse>(
    "/admin/characters/references/register",
    payload,
  );
}
