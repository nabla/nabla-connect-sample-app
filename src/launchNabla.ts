import { requestAccessToken } from './requestToken';
import { provisionUser } from './provisionUser';
import {
  LaunchEncounterPayload,
  LaunchEncounterResponseSchema,
  PatientGender,
  PatientPronouns,
} from './types';

export interface LaunchNablaQuery {
  patientId?: string;
  providerEmail?: string;
  providerId?: string;
  patientName?: string;
  patientBirthDate?: string;
  patientGender?: PatientGender;
  patientPronouns?: PatientPronouns | undefined;
  unstructuredContext?: string | undefined;
}

type LaunchNablaParams = {
  baseUrl: string;
  requestBody: LaunchEncounterPayload;
};

export const launchNabla = async ({ baseUrl, requestBody }: LaunchNablaParams): Promise<string> => {
  const url = new URL(`${baseUrl}/encounter`);

  const accessToken = await requestAccessToken({
    baseUrl,
    oauthClientId: process.env.OAUTH_CLIENT_ID!,
    oauthPrivateKey: process.env.OAUTH_PRIVATE_KEY!,
  });

  const provisionedUser = await provisionUser({
    baseUrl,
    accessToken,
    providerEmail: requestBody.provider_email,
    externalProviderId: requestBody.external_provider_id,
  });

  console.log('Launching Nabla encounter at', url.toString());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Nabla-Api-Version': process.env.NABLA_API_VERSION!,
    },
    body: JSON.stringify({
      ...requestBody,
      external_provider_id: provisionedUser.external_provider_id,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nabla launch encounter request failed', response.status, errorText);
    throw new Error(`Nabla launch encounter request failed: ${response.status} ${errorText}`);
  }

  const responseJson = LaunchEncounterResponseSchema.parse(await response.json());
  console.log('Nabla encounter launched successfully, encounter URL:', responseJson.encounter_url);
  return responseJson.encounter_url;
};
