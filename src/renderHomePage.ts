import { randomUUID } from 'node:crypto';
import ejs from 'ejs';

type RenderHomePageParams = {
  encounterApiUrl: string;
  usersApiUrl: string;
  settingsApiUrl: string;
};

type DemoStep = {
  title: string;
  description: string;
  endpoint: string;
  proxyEndpoint: string;
  payload: object;
  resultField?: 'settings_url' | 'encounter_url';
};

const shortUuid = () => randomUUID().replace(/-/g, '').slice(0, 8);

const homeTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nabla Connect Demo</title>
    <style>
      :root {
        --accent: #0ea5e9;
        --accent-dark: #0284c7;
        --border: #e2e8f0;
        --bg: #f8fafc;
        --code-bg: #0f172a;
        --muted: #64748b;
        --text: #0f172a;
      }
      * { box-sizing: border-box; }
      html, body {
        min-height: 100%;
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background: var(--bg);
      }
      body { display: grid; place-items: center; padding: 32px 16px; }
      main {
        width: min(680px, 100%);
        min-height: 600px;
        padding: 32px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
      }
      header { margin-bottom: 28px; }
      h1 { margin: 0 0 6px; font-size: 22px; }
      .subtitle { margin: 0; color: var(--muted); font-size: 14px; }
      .progress { display: flex; gap: 6px; margin-top: 18px; }
      .progress-dot {
        height: 4px;
        flex: 1;
        border-radius: 999px;
        background: var(--border);
      }
      .progress-dot.active, .progress-dot.complete { background: var(--accent); }
      .slide { display: none; flex: 1; flex-direction: column; }
      .slide.active { display: flex; }
      .step-number {
        margin: 0 0 8px;
        color: var(--accent-dark);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h2 { margin: 0 0 8px; font-size: 24px; }
      .description {
        margin: 0 0 24px;
        color: var(--muted);
        font-size: 15px;
        line-height: 1.5;
      }
      .request {
        margin-bottom: 24px;
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
      }
      .endpoint {
        margin: 0;
        padding: 11px 14px;
        border-bottom: 1px solid var(--border);
        background: #f1f5f9;
        color: #334155;
        font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
        overflow-wrap: anywhere;
      }
      .method { color: #15803d; font-weight: 700; }
      pre {
        min-height: 150px;
        margin: 0;
        padding: 16px;
        overflow: auto;
        background: var(--code-bg);
        color: #e2e8f0;
        font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
        white-space: pre-wrap;
      }
      .actions { margin-top: auto; }
      button {
        width: 100%;
        padding: 11px 14px;
        border: 0;
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 650;
      }
      button:hover { background: var(--accent-dark); }
      button:disabled { cursor: wait; opacity: 0.65; }
      .next-button { margin-top: 8px; background: #0f172a; }
      .next-button:hover { background: #1e293b; }
      .status { min-height: 20px; margin: 10px 0 0; color: var(--muted); font-size: 13px; }
      .status.success { color: #15803d; }
      .status.error { color: #b91c1c; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Nabla Connect walkthrough</h1>
        <p class="subtitle">Compare onboarding and direct launches for settings and encounters.</p>
        <div class="progress" aria-label="Demo progress">
          <% steps.forEach(function(_step, index) { %>
            <span class="progress-dot<%= index === 0 ? ' active' : '' %>"></span>
          <% }) %>
        </div>
      </header>

      <% steps.forEach(function(step, index) { %>
        <section class="slide<%= index === 0 ? ' active' : '' %>" data-step="<%= index %>">
          <p class="step-number">Step <%= index + 1 %> of <%= steps.length %></p>
          <h2><%= step.title %></h2>
          <p class="description"><%= step.description %></p>
          <div class="request">
            <p class="endpoint"><span class="method">POST</span> <%= step.endpoint %></p>
            <pre><code class="payload"><%= JSON.stringify(step.payload, null, 2) %></code></pre>
          </div>
          <div class="actions">
            <button
              class="start-button"
              type="button"
              data-proxy-endpoint="<%= step.proxyEndpoint %>"
              data-result-field="<%= step.resultField ?? '' %>"
            >Start</button>
            <button class="next-button" type="button" hidden>
              <%= index === steps.length - 1 ? 'Restart demo' : 'Next' %>
            </button>
            <p class="status" aria-live="polite"></p>
          </div>
        </section>
      <% }) %>
    </main>

    <script>
      var slides = Array.from(document.querySelectorAll('.slide'));
      var dots = Array.from(document.querySelectorAll('.progress-dot'));
      var currentStep = 0;

      function showStep(index) {
        currentStep = index;
        slides.forEach(function (slide, slideIndex) {
          slide.classList.toggle('active', slideIndex === index);
        });
        dots.forEach(function (dot, dotIndex) {
          dot.classList.toggle('active', dotIndex === index);
          dot.classList.toggle('complete', dotIndex < index);
        });
      }

      document.querySelectorAll('.start-button').forEach(function (button) {
        button.addEventListener('click', async function () {
          var slide = button.closest('.slide');
          var status = slide.querySelector('.status');
          var nextButton = slide.querySelector('.next-button');
          var resultField = button.dataset.resultField;
          var launchWindow = resultField ? window.open('', '_blank') : null;

          button.disabled = true;
          nextButton.hidden = true;
          status.className = 'status';
          status.textContent = 'Starting…';

          try {
            var payload = JSON.parse(slide.querySelector('.payload').textContent);
            var response = await fetch(button.dataset.proxyEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            var body = await response.json();
            if (!response.ok) {
              throw new Error(body.errorMessage || 'Request failed with status ' + response.status);
            }
            if (resultField) {
              if (launchWindow) {
                launchWindow.location = body[resultField];
              } else {
                window.open(body[resultField], '_blank');
              }
              status.textContent = 'Launched in a new tab. Complete the flow, then return here.';
            } else {
              status.textContent =
                'Created ' + body.external_provider_id + ' (' + body.provider_email + ').';
            }
            status.classList.add('success');
            button.textContent = 'Start again';
            nextButton.hidden = false;
          } catch (error) {
            if (launchWindow) launchWindow.close();
            status.classList.add('error');
            status.textContent = error.message || 'Request failed';
          } finally {
            button.disabled = false;
          }
        });
      });

      document.querySelectorAll('.next-button').forEach(function (button, index) {
        button.addEventListener('click', function () {
          showStep(index === slides.length - 1 ? 0 : index + 1);
        });
      });
    </script>
  </body>
</html>`;

export const renderHomePage = ({
  encounterApiUrl,
  usersApiUrl,
  settingsApiUrl,
}: RenderHomePageParams): string => {
  const settingsProviderSuffix = shortUuid();
  const encounterProviderSuffix = shortUuid();
  const settingsProviderId = `provider-${settingsProviderSuffix}`;
  const encounterProviderId = `provider-${encounterProviderSuffix}`;
  const settingsProviderEmail = `${settingsProviderId}@nabla.test.com`;
  const encounterProviderEmail = `${encounterProviderId}@nabla.test.com`;

  const encounterPayload = {
    external_patient_id: `patient-${shortUuid()}`,
    external_encounter_id: `encounter-${shortUuid()}`,
    external_provider_id: encounterProviderId,
    provider_email: encounterProviderEmail,
    structured_context: {
      patient_demographics: {
        name: 'John Doe',
        birth_date: '1990-01-01',
        gender: 'OTHER',
      },
    },
  };

  const steps: DemoStep[] = [
    {
      title: 'Create a new user',
      description:
        'Create a provider who has never launched Nabla. This provider is used for the settings flow.',
      endpoint: usersApiUrl,
      proxyEndpoint: '/nabla/users',
      payload: {
        external_provider_id: settingsProviderId,
        provider_email: settingsProviderEmail,
      },
    },
    {
      title: 'Launch onboarding from settings',
      description:
        'Open settings for the new provider. Because this is their first launch, Nabla shows onboarding first.',
      endpoint: settingsApiUrl,
      proxyEndpoint: '/nabla/settings/url',
      payload: { external_provider_id: settingsProviderId },
      resultField: 'settings_url',
    },
    {
      title: 'Open settings directly',
      description:
        'Launch the same provider again. After onboarding is complete, Nabla opens settings directly.',
      endpoint: settingsApiUrl,
      proxyEndpoint: '/nabla/settings/url',
      payload: { external_provider_id: settingsProviderId },
      resultField: 'settings_url',
    },
    {
      title: 'Create another new user',
      description:
        'Create a second provider who has never launched Nabla. This provider is used for the encounter flow.',
      endpoint: usersApiUrl,
      proxyEndpoint: '/nabla/users',
      payload: {
        external_provider_id: encounterProviderId,
        provider_email: encounterProviderEmail,
      },
    },
    {
      title: 'Launch onboarding from an encounter',
      description:
        'Start an encounter for the new provider. Nabla shows onboarding first, then opens the encounter.',
      endpoint: encounterApiUrl,
      proxyEndpoint: '/nabla/encounters',
      payload: encounterPayload,
      resultField: 'encounter_url',
    },
    {
      title: 'Open an encounter directly',
      description:
        'Start another encounter for the same provider. After onboarding is complete, Nabla opens the encounter directly.',
      endpoint: encounterApiUrl,
      proxyEndpoint: '/nabla/encounters',
      payload: {
        ...encounterPayload,
        external_patient_id: `patient-${shortUuid()}`,
        external_encounter_id: `encounter-${shortUuid()}`,
      },
      resultField: 'encounter_url',
    },
  ];

  return ejs.render(homeTemplate, { steps }, { rmWhitespace: true });
};
