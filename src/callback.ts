import {
  NablaCallbackBody,
  NablaCallbackResponse,
  NablaNoteExportBody,
  NablaPatientInstructionsExportCallbackBody,
} from './types';

export type Response = {
  status: number;
  message?: string;
  body?: NablaCallbackResponse;
};

const formatNoteExportLog = (body: NablaNoteExportBody) => {
  const {
    request_uuid,
    data: { external_patient_id, external_encounter_id, external_provider_id, note },
  } = body;

  const sections = note.sections
    .map((section, idx) => {
      const header = `  Section ${idx + 1}: ${section.title}${
        section.category ? ` (${section.category})` : ''
      }`;
      const content = section.content
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n');
      return `${header}\n${content}`;
    })
    .join('\n');

  return [
    `[NOTE_EXPORT] request=${request_uuid}`,
    `Patient=${external_patient_id} Encounter=${external_encounter_id} Provider=${external_provider_id}`,
    sections ? `Note:\n${sections}` : 'Note: (no sections)',
  ].join('\n');
};

const formatPatientInstructionsLog = (body: NablaPatientInstructionsExportCallbackBody) => {
  const {
    request_uuid,
    data: {
      external_patient_id,
      external_encounter_id,
      external_provider_id,
      patient_instructions,
    },
  } = body;

  const instructions = patient_instructions.instructions;

  return [
    `[PATIENT_INSTRUCTIONS_EXPORT] request=${request_uuid}`,
    `Patient=${external_patient_id} Encounter=${external_encounter_id} Provider=${external_provider_id}`,
    instructions ? `Instructions:\n${instructions}` : 'Instructions: (none)',
  ].join('\n');
};

export const handleCallback = async (body: NablaCallbackBody) => {
  switch (body.type) {
    case 'NOTE_EXPORT':
      console.log(formatNoteExportLog(body));
      break;
    case 'PATIENT_INSTRUCTIONS_EXPORT':
      console.log(formatPatientInstructionsLog(body));
      break;
  }
};
