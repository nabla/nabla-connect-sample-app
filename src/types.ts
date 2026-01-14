import z from 'zod';

const PATIENT_GENDER_VALUES = ['FEMALE', 'MALE', 'OTHER', 'UNKNOWN'] as const;
export type PatientGender = (typeof PATIENT_GENDER_VALUES)[number];

const PATIENT_PRONOUN_VALUES = ['HE_HIM', 'SHE_HER', 'THEY_THEM'] as const;
export type PatientPronouns = (typeof PATIENT_PRONOUN_VALUES)[number];

const genderEnum = z.enum(PATIENT_GENDER_VALUES);
const pronounEnum = z.enum(PATIENT_PRONOUN_VALUES);

const StructuredContextSchema = z.object({
  patient_demographics: z.object({
    name: z.string(),
    birth_date: z.iso.date(),
    gender: genderEnum,
    pronouns: pronounEnum.optional(),
  }),
});

export const LaunchEncounterPayloadSchema = z.object({
  external_patient_id: z.string(),
  external_encounter_id: z.string(),
  external_provider_id: z.string(),
  provider_email: z.email(),
  structured_context: StructuredContextSchema,
  unstructured_context: z.string().optional(),
});

export const LaunchEncounterResponseSchema = z.object({
  encounter_url: z.url(),
});

export type LaunchEncounterPayload = z.infer<typeof LaunchEncounterPayloadSchema>;

export type LaunchEncounterResponse = z.infer<typeof LaunchEncounterResponseSchema>;

export const noteSectionSchema = z.object({
  title: z.string(),
  category: z.string().nullable(),
  content: z.string(),
});

export const encounterNoteSchema = z.object({
  sections: z.array(noteSectionSchema),
});

export const patientInstructionsSchema = z.object({
  instructions: z.array(z.string()),
});

export type EncounterNote = z.infer<typeof encounterNoteSchema>;
export type EncounterNoteSection = z.infer<typeof noteSectionSchema>;

const baseCallbackSchema = z.object({
  request_uuid: z.string(),
  type: z.enum(['NOTE_EXPORT', 'PATIENT_INSTRUCTIONS_EXPORT']),
});

export const noteExportNablaCallbackBodySchema = baseCallbackSchema.extend({
  type: z.literal('NOTE_EXPORT'),
  data: z.object({
    external_patient_id: z.string(),
    external_encounter_id: z.string(),
    external_provider_id: z.string(),
    note: encounterNoteSchema,
  }),
});

export const patientInstructionsExportNablaCallbackBodySchema = baseCallbackSchema.extend({
  type: z.literal('PATIENT_INSTRUCTIONS_EXPORT'),
  data: z.object({
    external_patient_id: z.string(),
    external_encounter_id: z.string(),
    external_provider_id: z.string(),
    patient_instructions: patientInstructionsSchema,
  }),
});

export const nablaCallbackBodySchema = z.union([
  noteExportNablaCallbackBodySchema,
  patientInstructionsExportNablaCallbackBodySchema,
]);

export type NablaNoteExportBody = z.infer<typeof noteExportNablaCallbackBodySchema>;
export type NablaPatientInstructionsExportCallbackBody = z.infer<
  typeof patientInstructionsExportNablaCallbackBodySchema
>;
export type NablaCallbackBody = NablaNoteExportBody | NablaPatientInstructionsExportCallbackBody;

export const nablaCallbackResponseSchema = z.object({
  request_uuid: z.string(),
});

export type NablaCallbackResponse = z.infer<typeof nablaCallbackResponseSchema>;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
