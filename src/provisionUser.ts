import { requestAccessToken } from './requestToken';
import {
  HttpError,
  ProvisionUserRequest,
  ProvisionUserResponse,
  ProvisionUserResponseSchema,
} from './types';

type ProvisionUserParams = {
  baseUrl: string;
  requestBody: ProvisionUserRequest;
};

export const provisionUser = async ({
  baseUrl,
  requestBody,
}: ProvisionUserParams): Promise<ProvisionUserResponse> => {
  const url = new URL(`${baseUrl}/users`);

  const accessToken = await requestAccessToken({
    baseUrl,
    oauthClientId: process.env.OAUTH_CLIENT_ID!,
    oauthPrivateKey: process.env.OAUTH_PRIVATE_KEY!,
  });
  console.log('Provisioning user at', url.toString());

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
    console.error('Nabla provision user request failed', response.status, errorText);
    throw new HttpError(response.status, `Nabla provision user request failed: ${errorText}`);
  }

  return ProvisionUserResponseSchema.parse(await response.json());
};
