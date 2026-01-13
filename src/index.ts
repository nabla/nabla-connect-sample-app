import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { launchNabla, LaunchNablaQuery } from './launchNabla';
import {
  HttpError,
  LaunchEncounterPayload,
  NablaCallbackBody,
  NablaCallbackResponse,
} from './types';
import { handleCallback } from './callback';
import { verifyHmacSignature } from './signatureVerification';
import { renderEncounterPage } from './renderEncounterPage';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const signingSecret = process.env.NABLA_SIGNATURE_SECRET;
const expectedEnvVars = [
  'NABLA_URL',
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

app.get(
  '/nabla/open/:encounterId',
  async (
    request: express.Request<{ encounterId: string }, unknown, unknown, LaunchNablaQuery>,
    response,
  ) => {
    const { encounterId } = request.params;
    const {
      patientId,
      providerEmail,
      providerId,
      patientName,
      patientDob,
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
        encounter_data: {
          patient_name: patientName || 'John Doe',
          patient_dob: patientDob || '1990-01-01',
          patient_gender: patientGender || 'OTHER',
          patient_pronouns: patientPronouns,
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
          patientName: requestBody.encounter_data.patient_name,
          patientDob: requestBody.encounter_data.patient_dob,
          patientGender: requestBody.encounter_data.patient_gender,
          patientPronouns: requestBody.encounter_data.patient_pronouns,
          unstructuredContext: requestBody.unstructured_context,
        }),
      );
    } catch (error) {
      console.error('Error launching Nabla encounter:', error);
      throw new HttpError(500, 'Error launching Nabla encounter');
    }
  },
);

app.post(
  '/nabla/callback',
  bodyParser.json({
    type: 'application/json',
    verify: function (request, response, buffer) {
      verifyHmacSignature({
        timestamp: request.headers['x-nabla-connect-timestamp'] as string,
        signatures: request.headers['x-nabla-connect-signature'] as string,
        rawBody: buffer,
        key: signingSecret || 'insecure-development-signing-secret',
      });
    },
  }),
  async (
    request: express.Request<unknown, unknown, NablaCallbackBody, unknown>,
    response: express.Response<NablaCallbackResponse>,
  ) => {
    await handleCallback(request.body);
    response.status(200).json({ request_uuid: request.body.request_uuid });
  },
);

app.use(
  (
    error: Error,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
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
