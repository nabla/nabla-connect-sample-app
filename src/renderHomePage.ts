import ejs from 'ejs';

type RenderHomePageParams = {
  defaultProviderId?: string | undefined;
  defaultProviderEmail?: string | undefined;
};

const homeTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nabla Connect Demo</title>
    <style>
      :root {
        --border: #e5e7eb;
        --bg: #f8fafc;
        --text: #0f172a;
        --muted: #475569;
        --accent: #0ea5e9;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text); background: var(--bg); }
      main { max-width: 560px; margin: 40px auto; padding: 24px; background: #fff; border: 1px solid var(--border); border-radius: 12px; }
      h1 { margin: 0 0 4px; font-size: 20px; }
      p.subtitle { margin: 0 0 24px; color: var(--muted); font-size: 14px; }
      h2 { font-size: 14px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--muted); margin: 0 0 12px; }
      label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; }
      .field { margin-bottom: 12px; }
      input, select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--bg); }
      button, .button { display: inline-block; width: 100%; padding: 10px 12px; border: 0; border-radius: 8px; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; }
      .button.secondary { background: #fff; color: var(--text); border: 1px solid var(--border); }
      hr { border: 0; border-top: 1px solid var(--border); margin: 28px 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Nabla Connect demo</h1>
      <p class="subtitle">Launch Nabla the way your EHR would.</p>

      <h2>Start an encounter</h2>
      <form id="encounter-form" method="get">
        <div class="field">
          <label for="encounterId">Encounter ID *</label>
          <input id="encounterId" value="encounter-123" required />
        </div>
        <div class="field">
          <label for="patientId">Patient ID</label>
          <input id="patientId" name="patientId" value="patient-123456" />
        </div>
        <div class="field">
          <label for="patientName">Patient name</label>
          <input id="patientName" name="patientName" value="John Doe" />
        </div>
        <div class="field">
          <label for="patientBirthDate">Patient date of birth</label>
          <input id="patientBirthDate" name="patientBirthDate" type="date" value="1990-01-01" />
        </div>
        <div class="field">
          <label for="patientGender">Patient gender</label>
          <select id="patientGender" name="patientGender">
            <option value="OTHER">OTHER</option>
            <option value="FEMALE">FEMALE</option>
            <option value="MALE">MALE</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </div>
        <div class="field">
          <label for="providerId">Provider ID</label>
          <input id="providerId" name="providerId" value="<%= defaultProviderId %>" />
        </div>
        <div class="field">
          <label for="providerEmail">Provider email</label>
          <input id="providerEmail" name="providerEmail" value="<%= defaultProviderEmail %>" />
        </div>
        <button type="submit">Start encounter</button>
      </form>

      <hr />

      <h2>No encounter</h2>
      <a class="button secondary" href="/nabla/open/settings">Go to settings</a>
    </main>

    <script>
      document.getElementById('encounter-form').addEventListener('submit', function (event) {
        var encounterId = document.getElementById('encounterId').value;
        event.currentTarget.action = '/nabla/open/' + encodeURIComponent(encounterId);
      });
    </script>
  </body>
</html>`;

export const renderHomePage = ({
  defaultProviderId,
  defaultProviderEmail,
}: RenderHomePageParams): string =>
  ejs.render(
    homeTemplate,
    {
      defaultProviderId: defaultProviderId ?? '',
      defaultProviderEmail: defaultProviderEmail ?? '',
    },
    { rmWhitespace: true },
  );
