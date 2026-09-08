import dotenv from 'dotenv';
import express from 'express';
import { ZodError } from 'zod';
import { launchNabla, LaunchNablaQuery } from './launchNabla';
import { generateEncounterUrl } from './generateEncounterUrl';
import { generateSettingsUrl } from './generateSettingsUrl';
import { provisionUser } from './provisionUser';
import {
  HttpError,
  LaunchEncounterPayload,
  LaunchEncounterPayloadSchema,
  NablaCallbackResponse,
  nablaCallbackBodySchema,
  GenerateEncounterUrlRequestSchema,
  GenerateSettingsUrlRequestSchema,
  ProvisionUserRequestSchema,
} from './types';
import { handleCallback } from './callback';
import {
  configuredCallbackOauthCredentials,
  handleOauthTokenRequest,
  verifyCallbackBearerToken,
} from './oauthTokenServer';
import { verifyHmacSignature } from './signatureVerification';
import { renderEncounterPage } from './renderEncounterPage';
import { renderHomePage } from './renderHomePage';
import { renderSettingsPage } from './renderSettingsPage';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const signingSecret = process.env.NABLA_SIGNATURE_SECRET;
const expectedEnvVars = [
  'NABLA_URL',
  'NABLA_API_VERSION',
  'NABLA_SIGNATURE_SECRET',
  'OAUTH_PRIVATE_KEY',
  'OAUTH_CLIENT_ID',
  'DEFAULT_PROVIDER_EMAIL',
  'DEFAULT_PROVIDER_ID',
] as const;

const missingEnvVars = expectedEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
  console.warn(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}

if (!signingSecret) {
  console.warn('NABLA_SIGNATURE_SECRET not set; falling back to insecure development secret.');
}

if (configuredCallbackOauthCredentials()) {
  console.log(
    'Callback OAuth client credentials configured; serving POST /oauth/token and requiring a bearer token on POST /nabla/callback.',
  );
} else {
  console.warn(
    'CALLBACK_OAUTH_CLIENT_ID / CALLBACK_OAUTH_CLIENT_SECRET not set; callback bearer-token verification is disabled.',
  );
}

app.get('/', (_request: express.Request, response: express.Response) => {
  response.send(
    renderHomePage({
      encounterApiUrl: `${process.env.NABLA_URL ?? ''}/encounters`,
      usersApiUrl: `${process.env.NABLA_URL ?? ''}/users`,
      settingsApiUrl: `${process.env.NABLA_URL ?? ''}/settings/url`,
    }),
  );
});

app.get(
  '/nabla/open/settings',
  async (
    request: express.Request<unknown, unknown, unknown, { providerId?: string }>,
    response,
    next: express.NextFunction,
  ) => {
    const providerId = request.query.providerId || process.env.DEFAULT_PROVIDER_ID!;

    try {
      const settingsUrl = await generateSettingsUrl({
        baseUrl: process.env.NABLA_URL!,
        requestBody: { external_provider_id: providerId },
      });
      response.send(renderSettingsPage({ settingsUrl, providerId }));
    } catch (error) {
      console.error('Error launching Nabla settings:', error);
      next(new HttpError(500, 'Error launching Nabla settings'));
    }
  },
);

app.get(
  '/nabla/open/:encounterId',
  async (
    request: express.Request<{ encounterId: string }, unknown, unknown, LaunchNablaQuery>,
    response,
    next: express.NextFunction,
  ) => {
    const { encounterId } = request.params;
    const {
      patientId,
      providerEmail,
      providerId,
      patientName,
      patientBirthDate,
      patientGender,
      patientPronouns,
      unstructuredContext,
    } = request.query;

    // Launch the Nabla encounter
    try {
      const requestBody: LaunchEncounterPayload = {
        external_patient_id: patientId || 'patient-123456',
        external_encounter_id: encounterId,
        external_provider_id: providerId || process.env.DEFAULT_PROVIDER_ID!,
        provider_email: providerEmail || process.env.DEFAULT_PROVIDER_EMAIL!,
        structured_context: {
          patient_demographics: {
            name: patientName || 'John Doe',
            birth_date: patientBirthDate || '1990-01-01',
            gender: patientGender || 'OTHER',
            pronouns: patientPronouns,
          },
        },
        unstructured_context: unstructuredContext,
      };
      const encounterUrl = await launchNabla({
        baseUrl: process.env.NABLA_URL!,
        requestBody,
      });
      response.send(
        renderEncounterPage({
          encounterUrl,
          patientId: requestBody.external_patient_id,
          providerEmail: requestBody.provider_email,
          providerId: requestBody.external_provider_id,
          patientName: requestBody.structured_context.patient_demographics.name,
          patientBirthDate: requestBody.structured_context.patient_demographics.birth_date,
          patientGender: requestBody.structured_context.patient_demographics.gender,
          patientPronouns: requestBody.structured_context.patient_demographics.pronouns,
          unstructuredContext: requestBody.unstructured_context,
        }),
      );
    } catch (error) {
      console.error('Error launching Nabla encounter:', error);
      next(new HttpError(500, 'Error launching Nabla encounter'));
    }
  },
);

app.post(
  '/nabla/encounters',
  express.json({ type: 'application/json' }),
  async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const requestBody = LaunchEncounterPayloadSchema.parse(request.body);
      const encounterUrl = await launchNabla({
        baseUrl: process.env.NABLA_URL!,
        requestBody,
      });
      response.status(200).json({ encounter_url: encounterUrl });
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new HttpError(400, `Invalid request body: ${error.message}`));
      } else {
        console.error('Error launching encounter:', error);
        next(new HttpError(500, 'Error launching encounter'));
      }
    }
  },
);

app.post(
  '/nabla/encounters/url',
  express.json({ type: 'application/json' }),
  async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const requestBody = GenerateEncounterUrlRequestSchema.parse(request.body);
      const encounterUrl = await generateEncounterUrl({
        baseUrl: process.env.NABLA_URL!,
        requestBody,
      });
      response.status(200).json({ encounter_url: encounterUrl });
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new HttpError(400, `Invalid request body: ${error.message}`));
      } else {
        console.error('Error generating encounter URL:', error);
        next(new HttpError(500, 'Error generating encounter URL'));
      }
    }
  },
);

app.post(
  '/nabla/settings/url',
  express.json({ type: 'application/json' }),
  async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const requestBody = GenerateSettingsUrlRequestSchema.parse(request.body);
      const settingsUrl = await generateSettingsUrl({
        baseUrl: process.env.NABLA_URL!,
        requestBody,
      });
      response.status(200).json({ settings_url: settingsUrl });
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new HttpError(400, `Invalid request body: ${error.message}`));
      } else {
        console.error('Error generating settings URL:', error);
        next(new HttpError(500, 'Error generating settings URL'));
      }
    }
  },
);

app.post(
  '/nabla/users',
  express.json({ type: 'application/json' }),
  async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    try {
      const requestBody = ProvisionUserRequestSchema.parse(request.body);
      const user = await provisionUser({ baseUrl: process.env.NABLA_URL!, requestBody });
      response.status(200).json(user);
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new HttpError(400, `Invalid request body: ${error.message}`));
      } else {
        console.error('Error provisioning user:', error);
        next(new HttpError(500, 'Error provisioning user'));
      }
    }
  },
);

app.post(
  '/oauth/token',
  express.json({ type: 'application/json' }),
  express.urlencoded({ extended: false }),
  handleOauthTokenRequest,
);

app.post(
  '/nabla/callback',
  express.raw({ type: 'application/json' }),
  async (
    request: express.Request,
    response: express.Response<NablaCallbackResponse>,
    next: express.NextFunction,
  ) => {
    const rawBody = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(String(request.body ?? ''));

    try {
      verifyCallbackBearerToken(request.headers.authorization);
      verifyHmacSignature({
        timestamp: request.headers['x-nabla-connect-timestamp'] as string,
        signatures: request.headers['x-nabla-connect-signature'] as string,
        rawBody,
        key: signingSecret || 'insecure-development-signing-secret',
      });

      const callbackBody = nablaCallbackBodySchema.parse(JSON.parse(rawBody.toString('utf8')));
      await handleCallback(callbackBody);
      response.status(200).json({ request_uuid: callbackBody.request_uuid });
    } catch (error) {
      next(error);
    }
  },
);

app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof HttpError) {
      response.status(error.status).send({ errorMessage: error.message });
    } else {
      console.error('Unexpected error:', error);
      response.status(500).send({ errorMessage: 'Internal Server Error' });
    }
  },
);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
