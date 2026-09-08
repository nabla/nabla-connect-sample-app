# Nabla Connect Demo Server

A minimal Express.js backend that demonstrates how to integrate with [Nabla Connect](https://nabla-tech.notion.site/nabla-connect-documentation). It handles OAuth-signed launches, validates callbacks, and prints exported content so you can explore the workflow locally.

---

## Quick Start

### 0. Prerequisites

- Node.js 18+
- Yarn
- A Nabla Connect account (reach out at connect@nabla.com if you need access)

### 1. Download and install

```bash
git clone https://github.com/nabla/nabla-connect-sample-app.git
cd nabla-connect-sample-app
yarn install
```

### 2. Create credentials

1. Follow the Nabla Connect documentation to create an OAuth client (public-key method).
2. Collect the following values:
   - `OAUTH_CLIENT_ID`
   - `OAUTH_PRIVATE_KEY` (PEM string)
   - `NABLA_URL` for your region
   - `NABLA_API_VERSION` (e.g. `2026-03-23`; use `x-nabla-next` only for unreleased preview APIs)
   - `NABLA_SIGNATURE_SECRET` (shared secret used for webhook signing)
   - Optional defaults for `DEFAULT_PROVIDER_ID` and `DEFAULT_PROVIDER_EMAIL`

### 3. Configure the environment

Copy `.env.example` to `.env` and fill in every required field:

```env
NABLA_URL=https://<region>.api.nabla.com/v1/connect/server
NABLA_API_VERSION=2026-03-23
NABLA_SIGNATURE_SECRET=your-callback-secret
DEFAULT_PROVIDER_ID=prov-123456
DEFAULT_PROVIDER_EMAIL=provider@example.com
OAUTH_CLIENT_ID=client-uuid
OAUTH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
PORT=4000
```

### 4. Run the server

- Development (ts-node-dev hot reload):

  ```bash
  yarn dev
  ```

- Production build:

  ```bash
  yarn build
  yarn start
  ```

> [!NOTE]
> The dev server listens on `http://localhost:4000` by default. Tunnels such as `ngrok` let Nabla deliver callbacks to your machine for end-to-end testing.

---

## Endpoints

- `GET /`  
  Six-step walkthrough comparing onboarding and direct launches from settings and encounters.

- `POST /nabla/encounters`
  Creates or updates an encounter (`POST /encounters`) and returns its one-time login URL. The walkthrough uses this proxy for its encounter steps.

- `GET /nabla/open/:encounterId`  
  Creates or updates a Nabla encounter (`POST /encounters`) and returns a page with the encounter URL. The provider is logged in automatically when they navigate to it.

  | Query param           | Required | Description                                                            |
  | --------------------- | -------- | ---------------------------------------------------------------------- |
  | `patientId`           | Yes      | External patient identifier used by your system.                       |
  | `patientName`         | No       | Patient full name; fills encounter metadata.                           |
  | `patientBirthDate`    | No       | Patient date of birth (ISO date string).                               |
  | `patientGender`       | No       | One of `FEMALE`, `MALE`, `OTHER`, `UNKNOWN`.                           |
  | `patientPronouns`     | No       | One of `HE_HIM`, `SHE_HER`, `THEY_THEM`.                               |
  | `providerEmail`       | No       | Email of the provider launching the encounter.                         |
  | `providerId`          | No       | External provider identifier; defaults apply.                          |
  | `unstructuredContext` | No       | Free-text patient context used during note generation (max 700 chars). |

- `POST /nabla/encounters/url`  
  Generates a URL for an **existing** Nabla encounter (`POST /encounters/url`). Useful when the encounter was already created and you only need a fresh login link.

  Request body:

  ```json
  {
    "external_encounter_id": "enc-123",
    "external_provider_id": "prov-456"
  }
  ```

  Response: `{ "encounter_url": "https://..." }`

  ```bash
  curl -X POST http://localhost:4000/nabla/encounters/url \
    -H 'Content-Type: application/json' \
    -d '{"external_encounter_id":"enc-123","external_provider_id":"prov-456"}'
  ```

- `GET /nabla/open/settings`  
  Generates a settings URL (`POST /settings/url`) for an existing provider. No encounter is created. Preview API: set `NABLA_API_VERSION=x-nabla-next`.

  | Query param  | Required | Description                                    |
  | ------------ | -------- | ---------------------------------------------- |
  | `providerId` | No       | External provider identifier; defaults apply. |

- `POST /nabla/settings/url`  
  Generates a URL that opens Nabla settings for an existing provider (`POST /settings/url`). No encounter is created.

  Request body:

  ```json
  {
    "external_provider_id": "prov-456"
  }
  ```

  Response: `{ "settings_url": "https://..." }`

  ```bash
  curl -X POST http://localhost:4000/nabla/settings/url \
    -H 'Content-Type: application/json' \
    -d '{"external_provider_id":"prov-456"}'
  ```

- `POST /nabla/users`  
  Upserts a provider user (`POST /users`). Matching is done on `external_provider_id`. Creates the user if new; updates settings if the user already exists. Returns `409` if `external_provider_id` and `provider_email` identify two different existing users.

  Request body:

  ```json
  {
    "provider_email": "provider@example.com",
    "external_provider_id": "prov-456",
    "settings": {
      "specialty": { "kind": "GENERAL_MEDICINE" },
      "speech_locale": "ENGLISH_US"
    }
  }
  ```

  `settings` is optional. See the [Nabla Connect API docs](https://nabla-tech.notion.site/nabla-connect-documentation) for the full settings schema.

  ```bash
  curl -X POST http://localhost:4000/nabla/users \
    -H 'Content-Type: application/json' \
    -d '{"provider_email":"provider@example.com","external_provider_id":"prov-456"}'
  ```

- `POST /nabla/callback`
  Receives Nabla export callbacks, verifies their signature, and logs formatted notes or patient instructions so you can inspect the payloads during development.

  `NOTE_EXPORT` payload shape (API version `2026-03-23`):

  ```json
  {
    "request_uuid": "…",
    "type": "NOTE_EXPORT",
    "data": {
      "external_patient_id": "…",
      "external_encounter_id": "…",
      "external_provider_id": "…",
      "note": {
        "sections": [{ "content": "…", "title": "…", "category": "ASSESSMENT_AND_PLAN" }]
      },
      "visit_diagnoses": [
        {
          "system": "http://hl7.org/fhir/sid/icd-10-cm",
          "code": "I50.23",
          "display": "…",
          "is_hcc": true,
          "is_mcc": true
        }
      ]
    }
  }
  ```

  `visit_diagnoses` may be omitted or `null` before normalization completes; the sample app treats that as an empty list. Some orgs also receive an optional `transcript` field.

- `POST /oauth/token`
  Mock OAuth2 client-credentials token endpoint (RFC 6749 §4.4), used to test bearer-token authentication on the callback. Only enabled when `CALLBACK_OAUTH_CLIENT_ID` and `CALLBACK_OAUTH_CLIENT_SECRET` are set.

---

## Testing OAuth client-credentials callback auth

Nabla can authenticate to your callback endpoint with the OAuth2 client-credentials grant: before each delivery it fetches a token from your token endpoint and attaches it as `Authorization: Bearer <token>`. This app can play the customer side:

1. Set `CALLBACK_OAUTH_CLIENT_ID` and `CALLBACK_OAUTH_CLIENT_SECRET` in `.env` and restart the server. The app now serves `POST /oauth/token` and **requires** a valid bearer token on `POST /nabla/callback` (in addition to the HMAC signature).
2. Configure the same credentials in Nabla via the `updateNablaConnectConfiguration` mutation:

   ```graphql
   mutation {
     updateNablaConnectConfiguration(
       input: {
         oauthClientCredentials: {
           tokenEndpoint: "https://<your-tunnel-host>/oauth/token"
           variant: FORM_URL_ENCODED # or JSON_BODY — both are supported by this app
           clientId: "<CALLBACK_OAUTH_CLIENT_ID>"
           clientSecret: "<CALLBACK_OAUTH_CLIENT_SECRET>"
         }
       }
     ) {
       organization {
         uuid
       }
     }
   }
   ```

3. Trigger a note export: the app logs the token grant (`Issued OAuth access token …`) followed by the verified bearer on the callback (`Verified callback bearer token …`).
4. To exercise the failure path, configure a wrong `clientSecret` in Nabla: the token endpoint answers `401 {"error": "invalid_client"}` and Nabla fails the callback with `NABLA_CONNECT_OAUTH_TOKEN_FETCH_FAILED` instead of sending it unauthenticated.

Smoke-test the token endpoint directly:

```bash
curl -s -X POST http://localhost:4000/oauth/token \
  -d 'grant_type=client_credentials&client_id=<id>&client_secret=<secret>&audience=http://localhost:4000/nabla/callback'
```

To remove the configuration in Nabla, pass `removeOauthClientCredentials: true` to the same mutation.

---

## Further reading

- Nabla Connect documentation: <https://nabla-tech.notion.site/nabla-connect-documentation>
- OAuth and authentication guide: <https://nabla-tech.notion.site/nabla-connect-server-authentication>
- API changelog: <https://nabla-tech.notion.site/nabla-connect-documentation> (see the Changelog section)
