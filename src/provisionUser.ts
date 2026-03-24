import { ProvisionUserResponseSchema } from './types';

type ProvisionUserParams = {
  baseUrl: string;
  accessToken: string;
  providerEmail: string;
  externalProviderId: string;
};

export async function provisionUser({
  baseUrl,
  accessToken,
  providerEmail,
  externalProviderId,
}: ProvisionUserParams) {
  const url = new URL(`${baseUrl}/users`);
  console.log('Provisioning user at', url.toString());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-Nabla-Api-Version': process.env.NABLA_API_VERSION!,
    },
    body: JSON.stringify({
      provider_email: providerEmail,
      external_provider_id: externalProviderId,
      settings: {
        specialty: { kind: 'GENERAL_PRACTICE', other_specialty_name: null },
        speech_locale: 'en-US',
        secondary_speech_locale: null,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nabla provision user request failed', response.status, errorText);
    throw new Error(`Nabla provision user request failed: ${response.status} ${errorText}`);
  }

  const responseJson = ProvisionUserResponseSchema.parse(await response.json());
  console.log('User provisioned successfully:', responseJson.external_provider_id);
  return responseJson;
}
