import { requestAccessToken } from './requestToken';
import { GenerateSettingsUrlRequest, HttpError, SettingsUrlResponseSchema } from './types';

type GenerateSettingsUrlParams = {
  baseUrl: string;
  requestBody: GenerateSettingsUrlRequest;
};

export const generateSettingsUrl = async ({
  baseUrl,
  requestBody,
}: GenerateSettingsUrlParams): Promise<string> => {
  const url = new URL(`${baseUrl}/settings/url`);

  const accessToken = await requestAccessToken({
    baseUrl,
    oauthClientId: process.env.OAUTH_CLIENT_ID!,
    oauthPrivateKey: process.env.OAUTH_PRIVATE_KEY!,
  });
  console.log('Generating settings URL at', url.toString());

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
    console.error('Nabla generate settings URL request failed', response.status, errorText);
    throw new HttpError(response.status, `Nabla generate settings URL request failed: ${errorText}`);
  }

  const responseJson = SettingsUrlResponseSchema.parse(await response.json());
  console.log('Settings URL generated:', responseJson.settings_url);
  return responseJson.settings_url;
};
