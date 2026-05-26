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
   - `NABLA_SIGNATURE_SECRET` (shared secret used for webhook signing)
   - Optional defaults for `DEFAULT_PROVIDER_ID` and `DEFAULT_PROVIDER_EMAIL`

### 3. Configure the environment

Copy `.env.example` to `.env` and fill in every required field:

```env
NABLA_URL=https://api.nabla.com
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

- `GET /nabla/open/:encounterId`  
  Creates or updates a Nabla encounter (`POST /encounters`) and returns a page with the encounter URL. The provider is logged in automatically when they navigate to it.

  | Query param           | Required | Description                                                             |
  | --------------------- | -------- | ----------------------------------------------------------------------- |
  | `patientId`           | Yes      | External patient identifier used by your system.                        |
  | `patientName`         | No       | Patient full name; fills encounter metadata.                            |
  | `patientBirthDate`    | No       | Patient date of birth (ISO date string).                                |
  | `patientGender`       | No       | One of `FEMALE`, `MALE`, `OTHER`, `UNKNOWN`.                            |
  | `patientPronouns`     | No       | One of `HE_HIM`, `SHE_HER`, `THEY_THEM`.                               |
  | `providerEmail`       | No       | Email of the provider launching the encounter.                          |
  | `providerId`          | No       | External provider identifier; defaults apply.                           |
  | `unstructuredContext` | No       | Free-text patient context used during note generation (max 700 chars).  |

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

---

## Further reading

- Nabla Connect documentation: <https://nabla-tech.notion.site/nabla-connect-documentation>
- OAuth and authentication guide: <https://nabla-tech.notion.site/nabla-connect-server-authentication>
- API changelog: <https://nabla-tech.notion.site/nabla-connect-documentation> (see the Changelog section)
