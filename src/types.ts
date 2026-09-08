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
  content: z.string(),
  title: z.string(),
  category: z.string().nullable(),
});

export const noteExportNoteSchema = z.object({
  sections: z.array(noteSectionSchema),
});

export const patientInstructionsSchema = z.object({
  instructions: z.array(z.string()),
});

export type NoteExportNote = z.infer<typeof noteExportNoteSchema>;
export type NoteExportSection = z.infer<typeof noteSectionSchema>;

const baseCallbackSchema = z.object({
  request_uuid: z.string(),
  type: z.enum(['NOTE_EXPORT', 'PATIENT_INSTRUCTIONS_EXPORT']),
});

const transcriptItemSchema = z.object({
  speaker_type: z.string(),
  locale: z.string().optional(),
  text: z.string(),
  start_offset_ms: z.number(),
  end_offset_ms: z.number(),
});

export const transcriptSchema = z.preprocess(
  (value) => {
    if (value == null) return undefined;
    if (Array.isArray(value)) return { items: value };
    return value;
  },
  z
    .object({
      items: z.array(transcriptItemSchema),
    })
    .optional(),
);

export type Transcript = NonNullable<z.infer<typeof transcriptSchema>>;
export type TranscriptItem = Transcript['items'][number];

export const visitDiagnosisEntrySchema = z.object({
  system: z.string(),
  code: z.string(),
  display: z.string(),
  is_hcc: z.boolean(),
  is_mcc: z.boolean(),
});

export type VisitDiagnosisEntry = z.infer<typeof visitDiagnosisEntrySchema>;

/** NOTE_EXPORT callback payload (2026-03-23). `transcript` is an optional org-level extension. */
export const noteExportDataSchema = z.object({
  external_patient_id: z.string(),
  external_encounter_id: z.string(),
  external_provider_id: z.string(),
  note: noteExportNoteSchema,
  visit_diagnoses: z.preprocess(
    (value) => (value == null ? [] : value),
    z.array(visitDiagnosisEntrySchema),
  ),
  transcript: transcriptSchema,
});

export type NoteExportData = z.infer<typeof noteExportDataSchema>;

export const noteExportNablaCallbackBodySchema = baseCallbackSchema.extend({
  type: z.literal('NOTE_EXPORT'),
  data: noteExportDataSchema,
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

export const EncounterUrlResponseSchema = z.object({
  encounter_url: z.url(),
});

export const GenerateEncounterUrlRequestSchema = z.object({
  external_encounter_id: z.string(),
  external_provider_id: z.string(),
});

export type GenerateEncounterUrlRequest = z.infer<typeof GenerateEncounterUrlRequestSchema>;

export const SettingsUrlResponseSchema = z.object({
  settings_url: z.url(),
});

export const GenerateSettingsUrlRequestSchema = z.object({
  external_provider_id: z.string(),
});

export type GenerateSettingsUrlRequest = z.infer<typeof GenerateSettingsUrlRequestSchema>;

export const ProvisionUserRequestSchema = z.object({
  provider_email: z.email(),
  external_provider_id: z.string(),
  settings: z.unknown().optional(),
});

export type ProvisionUserRequest = z.infer<typeof ProvisionUserRequestSchema>;

export const ProvisionUserResponseSchema = z.object({
  provider_email: z.email(),
  external_provider_id: z.string(),
  settings: z.unknown(),
  created_at: z.string(),
});

export type ProvisionUserResponse = z.infer<typeof ProvisionUserResponseSchema>;

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}
