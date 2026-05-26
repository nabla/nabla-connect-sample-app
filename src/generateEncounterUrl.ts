import { requestAccessToken } from './requestToken';
import { GenerateEncounterUrlRequest, LaunchEncounterResponseSchema } from './types';

type GenerateEncounterUrlParams = {
  baseUrl: string;
  requestBody: GenerateEncounterUrlRequest;
};

export const generateEncounterUrl = async ({
  baseUrl,
  requestBody,
}: GenerateEncounterUrlParams): Promise<string> => {
  const url = new URL(`${baseUrl}/encounters/url`);

  const accessToken = await requestAccessToken({
    baseUrl,
    oauthClientId: process.env.OAUTH_CLIENT_ID!,
    oauthPrivateKey: process.env.OAUTH_PRIVATE_KEY!,
  });
  console.log('Generating encounter URL at', url.toString());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Nabla-Api-Version': process.env.NABLA_API_VERSION!,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nabla generate encounter URL request failed', response.status, errorText);
    throw new Error(`Nabla generate encounter URL request failed: ${response.status} ${errorText}`);
  }

  const responseJson = LaunchEncounterResponseSchema.parse(await response.json());
  console.log('Encounter URL generated:', responseJson.encounter_url);
  return responseJson.encounter_url;
};
