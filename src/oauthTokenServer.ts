import { randomUUID, timingSafeEqual } from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import z, { ZodError } from 'zod';
import { HttpError } from './types';

const ACCESS_TOKEN_LIFETIME_SECONDS = 3600;

const tokenRequestSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string(),
  client_secret: z.string(),
  audience: z.string().optional(),
});

export type OauthTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: 'Bearer';
};

type ConfiguredCredentials = {
  clientId: string;
  clientSecret: string;
};

/** Constant-time string comparison, mirroring `signaturesMatch` in signatureVerification.ts. */
function constantTimeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return timingSafeEqual(aBuffer, bBuffer);
}

export function configuredCallbackOauthCredentials(): ConfiguredCredentials | null {
  const clientId = process.env.CALLBACK_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CALLBACK_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

/**
 * Mock OAuth2 client-credentials token endpoint (RFC 6749 §4.4).
 *
 * Nabla calls it before each Connect callback delivery, with either an
 * `application/x-www-form-urlencoded` or an `application/json` body depending
 * on the configured variant; both are accepted here.
 */
export function handleOauthTokenRequest(
  request: express.Request,
  response: express.Response<OauthTokenResponse | { error: string }>,
  next: express.NextFunction,
) {
  const credentials = configuredCallbackOauthCredentials();
  if (!credentials) {
    next(
      new HttpError(
        503,
        'CALLBACK_OAUTH_CLIENT_ID / CALLBACK_OAUTH_CLIENT_SECRET are not configured',
      ),
    );
    return;
  }

  let tokenRequest: z.infer<typeof tokenRequestSchema>;
  try {
    tokenRequest = tokenRequestSchema.parse(request.body);
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn('Rejecting malformed token request:', error.message);
      response.status(400).json({ error: 'invalid_request' });
      return;
    }
    next(error);
    return;
  }

  // Evaluate both comparisons before branching so credential checks stay constant-time.
  const clientIdMatches = constantTimeEquals(tokenRequest.client_id, credentials.clientId);
  const clientSecretMatches = constantTimeEquals(
    tokenRequest.client_secret,
    credentials.clientSecret,
  );
  if (!clientIdMatches || !clientSecretMatches) {
    console.warn(
      `Rejecting token request with bad credentials (client_id=${tokenRequest.client_id})`,
    );
    response.status(401).json({ error: 'invalid_client' });
    return;
  }

  const variant = request.is('application/json') ? 'JSON_BODY' : 'FORM_URL_ENCODED';
  const accessToken = jwt.sign(
    {
      iss: 'nabla-connect-sample-app',
      sub: tokenRequest.client_id,
      ...(tokenRequest.audience ? { aud: tokenRequest.audience } : {}),
      jti: randomUUID(),
    },
    credentials.clientSecret,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS },
  );

  console.log(
    `Issued OAuth access token (variant=${variant}, client_id=${tokenRequest.client_id}, audience=${
      tokenRequest.audience ?? '<none>'
    })`,
  );

  response.status(200).json({
    access_token: accessToken,
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    token_type: 'Bearer',
  });
}

/**
 * Verifies the `Authorization: Bearer <token>` header attached by Nabla when
 * OAuth client credentials are configured for the Connect callback.
 *
 * No-op when CALLBACK_OAUTH_CLIENT_ID / CALLBACK_OAUTH_CLIENT_SECRET are not
 * set, to keep HMAC-only setups working.
 */
export function verifyCallbackBearerToken(authorizationHeader: string | undefined) {
  const credentials = configuredCallbackOauthCredentials();
  if (!credentials) {
    return;
  }

  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing bearer token');
  }

  const token = authorizationHeader.slice('Bearer '.length);
  let claims: jwt.JwtPayload | string;
  try {
    // NOTE: the `aud` claim is issued but intentionally not enforced here — this mock has no
    // configured callback URL to validate against. A production verifier should pass
    // `{ audience: <your callback URL> }` to bind the token to its intended recipient.
    claims = jwt.verify(token, credentials.clientSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Invalid bearer token');
  }

  if (typeof claims === 'object') {
    console.log(
      `Verified callback bearer token (sub=${claims.sub}, aud=${claims.aud}, exp=${claims.exp})`,
    );
  }
}
