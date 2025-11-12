import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import * as z from 'zod';
import { HttpError } from './types';

type AccessTokenParams = {
  baseUrl: string;
  oauthClientId: string;
  oauthPrivateKey: string;
};

const responseSchema = z.object({
  access_token: z.string(),
});

export async function requestAccessToken({
  baseUrl,
  oauthClientId, // from Nabla Connect admin page (https://app.nabla.com/admin/nabla-connect)
  oauthPrivateKey,
}: AccessTokenParams): Promise<string> {
  const url = new URL(`${baseUrl}/oauth/token`);
  console.log('OAuth client ID: ', oauthClientId);
  console.log('Requesting access token from', url.toString());
  if (!oauthPrivateKey || oauthPrivateKey.length === 0) {
    throw new HttpError(401, 'OAuth private key is not set');
  }
  const now = Math.floor(Date.now() / 1000);
  const clientAssertion = jwt.sign(
    {
      iss: oauthClientId,
      sub: oauthClientId,
      aud: url.toString(),
      jti: randomUUID(),
      iat: now,
      exp: now + 60,
    },
    oauthPrivateKey,
    { algorithm: 'RS256' },
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nabla token request failed', response.status, errorText);
    // handle error
    throw new HttpError(401, `Failed to obtain access token: ${response.status}\n${errorText}`);
  }

  const tokenJson = responseSchema.parse(await response.json());

  return tokenJson.access_token;
}
