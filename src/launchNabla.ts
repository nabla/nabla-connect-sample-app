import { requestAccessToken } from './requestToken';
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
  patientDob?: string;
  patientGender?: PatientGender;
  patientPronouns?: PatientPronouns;
}

type LaunchNablaParams = {
  baseUrl: string;
  encounterId: string;
  patientId: string | undefined;
  providerEmail: string | undefined;
  providerId: string | undefined;
  patientName: string | undefined;
  patientDob: string | undefined;
  patientGender: PatientGender | undefined;
  patientPronouns: PatientPronouns | undefined;
};

export const launchNabla = async ({
  baseUrl,
  encounterId,
  patientId,
  providerEmail,
  providerId,
  patientName,
  patientDob,
  patientGender,
  patientPronouns,
}: LaunchNablaParams): Promise<string> => {
  const url = new URL(`${baseUrl}/encounter`);
  const requestBody: LaunchEncounterPayload = {
    external_patient_id: patientId || 'patient-123456',
    external_encounter_id: encounterId,
    external_provider_id: providerId || process.env.DEFAULT_PROVIDER_ID!,
    provider_email: providerEmail || process.env.DEFAULT_PROVIDER_EMAIL!,
    encounter_data: {
      patient_name: patientName || 'John Doe',
      patient_dob: patientDob || '1990-01-01',
      patient_gender: patientGender || 'OTHER',
      patient_pronouns: patientPronouns || null,
    },
  };
  const accessToken = await requestAccessToken({
    baseUrl,
    oauthClientId: process.env.OAUTH_CLIENT_ID!,
    oauthPrivateKey: process.env.OAUTH_PRIVATE_KEY!,
  });
  console.log('Launching Nabla encounter at', url.toString());

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Nabla launch encounter request failed', response.status, errorText);
    throw new Error(`Nabla launch encounter request failed: ${response.status} ${errorText}`);
  }

  const responseJson = LaunchEncounterResponseSchema.parse(await response.json());
  return responseJson.encounter_url;
};
