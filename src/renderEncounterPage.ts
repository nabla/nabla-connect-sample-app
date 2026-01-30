import ejs from 'ejs';
import { LaunchNablaQuery } from './launchNabla';

type RenderEncounterPageParams = LaunchNablaQuery & {
  encounterUrl: string;
};

const encounterTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nabla Encounter</title>
    <style>
      :root {
        --border: #e5e7eb;
        --bg: #f8fafc;
        --text: #0f172a;
        --muted: #475569;
        --accent: #0ea5e9;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: var(--bg); }
      body { display: flex; min-height: 100vh; }
      .sidebar {
        width: 360px;
        max-width: 40vw;
        border-right: 1px solid var(--border);
        background: #fff;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }
      .section-title { margin: 0 0 8px; font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--muted); }
      .note-area { display: flex; flex-direction: column; gap: 8px; flex: 1; }
      .note-area textarea {
        width: 100%;
        min-height: 0;
        height: 100%;
        flex: 1;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        resize: vertical;
        font: 14px/1.4 monospace;
        background: var(--bg);
      }
      .context-card {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        background: linear-gradient(135deg, rgba(14,165,233,0.08), rgba(59,130,246,0.05));
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .context-row { display: flex; justify-content: space-between; font-size: 14px; }
      .context-label { color: var(--muted); margin-right: 8px; }
      .context-value { font-weight: 600; text-align: right; }
      .main-frame { flex: 1; }
      iframe { border: 0; width: 100%; height: 100vh; display: block; }
    </style>
  </head>
  <body>
    <aside class="sidebar">
      <div>
        <h2 class="section-title">Patient context</h2>
        <div class="context-card">
          <% patientContext.forEach(function(item) { %>
            <div class="context-row"><span class="context-label"><%= item.label %></span><span class="context-value"><%= item.value %></span></div>
          <% }) %>
        </div>
      </div>
    </aside>
    <main class="main-frame">
      <iframe src="<%= encounterUrl %>" allow="microphone;"></iframe>
    </main>
  </body>
</html>`;

const formatValue = (value: string | null | undefined) => (value ? value : '—');

export const renderEncounterPage = ({
  encounterUrl,
  patientId,
  providerEmail,
  providerId,
  patientName,
  patientBirthDate,
  patientGender,
  patientPronouns,
}: RenderEncounterPageParams): string => {
  const patientContext = [
    { label: 'Patient ID', value: formatValue(patientId) },
    { label: 'Name', value: formatValue(patientName) },
    { label: 'Date of Birth', value: formatValue(patientBirthDate) },
    { label: 'Gender', value: formatValue(patientGender) },
    { label: 'Pronouns', value: formatValue(patientPronouns) },
    { label: 'Provider Email', value: formatValue(providerEmail) },
    { label: 'Provider ID', value: formatValue(providerId) },
  ];

  return ejs.render(encounterTemplate, { encounterUrl, patientContext }, { rmWhitespace: true });
};
