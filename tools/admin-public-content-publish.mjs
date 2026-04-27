import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_SITE_URL = 'https://dalelalmuslim-github-io.pages.dev';
const PREVIEW_ENDPOINT = '/api/admin/public-content/preview';
const PUBLISH_ENDPOINT = '/api/admin/public-content/publish';

function printUsage() {
  console.log(`Usage:
  node tools/admin-public-content-publish.mjs --file <payload.json> --section <section> --version <version> [--notes <text>] [--site <url>]

Dry-run only, safe:
  node tools/admin-public-content-publish.mjs --file payload.json --section azkar --version azkar-2026-04-27-v1

Publish after reviewing preview output:
  node tools/admin-public-content-publish.mjs --file payload.json --section azkar --version azkar-2026-04-27-v1 --publish --confirm-version azkar-2026-04-27-v1 --confirm-hash <previewPayloadHash>

Auth environment, choose one:
  CF_ACCESS_JWT_ASSERTION=<jwt>
  CF_AUTHORIZATION_COOKIE=<CF_Authorization cookie value>
  ADMIN_AUTHORIZATION_BEARER=<bearer token>
  CF_ACCESS_CLIENT_ID=<service token client id> CF_ACCESS_CLIENT_SECRET=<service token client secret>
`);
}

function readOption(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

export function parseCliArgs(argv) {
  const options = {
    siteUrl: DEFAULT_SITE_URL,
    filePath: '',
    section: '',
    version: '',
    notes: '',
    schemaVersion: '',
    publish: false,
    confirmVersion: '',
    confirmHash: '',
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--site':
        options.siteUrl = readOption(argv, index, arg);
        index += 1;
        break;
      case '--file':
        options.filePath = readOption(argv, index, arg);
        index += 1;
        break;
      case '--section':
        options.section = readOption(argv, index, arg);
        index += 1;
        break;
      case '--version':
        options.version = readOption(argv, index, arg);
        index += 1;
        break;
      case '--notes':
        options.notes = readOption(argv, index, arg);
        index += 1;
        break;
      case '--schema-version':
        options.schemaVersion = readOption(argv, index, arg);
        index += 1;
        break;
      case '--publish':
        options.publish = true;
        break;
      case '--confirm-version':
        options.confirmVersion = readOption(argv, index, arg);
        index += 1;
        break;
      case '--confirm-hash':
        options.confirmHash = readOption(argv, index, arg);
        index += 1;
        break;
      default:
        throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  return options;
}

function normalizeSiteUrl(value) {
  const raw = String(value || DEFAULT_SITE_URL).trim().replace(/\/+$/g, '');
  const url = new URL(raw);

  if (url.protocol !== 'https:') {
    throw new Error('Site URL must use https.');
  }

  return url.href.replace(/\/+$/g, '');
}

function pickString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function buildAccessHeaders(env = process.env) {
  const headers = {
    'content-type': 'application/json',
    accept: 'application/json'
  };

  const jwt = pickString(env.CF_ACCESS_JWT_ASSERTION);
  if (jwt) {
    headers['cf-access-jwt-assertion'] = jwt;
  }

  const cookieValue = pickString(env.CF_AUTHORIZATION_COOKIE || env.CF_AUTHORIZATION);
  if (cookieValue) {
    headers.cookie = cookieValue.startsWith('CF_Authorization=')
      ? cookieValue
      : `CF_Authorization=${encodeURIComponent(cookieValue)}`;
  }

  const bearer = pickString(env.ADMIN_AUTHORIZATION_BEARER);
  if (bearer) {
    headers.authorization = `Bearer ${bearer}`;
  }

  const serviceClientId = pickString(env.CF_ACCESS_CLIENT_ID);
  const serviceClientSecret = pickString(env.CF_ACCESS_CLIENT_SECRET);
  if (serviceClientId || serviceClientSecret) {
    if (!serviceClientId || !serviceClientSecret) {
      throw new Error('Both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required for Cloudflare Access service token auth.');
    }

    headers['cf-access-client-id'] = serviceClientId;
    headers['cf-access-client-secret'] = serviceClientSecret;
  }

  return headers;
}

export function hasAccessAuth(headers) {
  return Boolean(
    headers['cf-access-jwt-assertion']
    || headers.cookie
    || headers.authorization
    || (headers['cf-access-client-id'] && headers['cf-access-client-secret'])
  );
}

function parsePayloadDocument(rawContent, filePath) {
  try {
    return JSON.parse(rawContent);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Invalid JSON.';
    throw new Error(`Unable to parse JSON payload file ${filePath}: ${details}`);
  }
}

export async function buildPublicContentRequest(options, deps = {}) {
  const readFile = deps.readFile || fs.readFile;
  const filePath = pickString(options.filePath);

  if (!filePath) {
    throw new Error('--file is required.');
  }

  const rawContent = await readFile(filePath, 'utf8');
  const document = parsePayloadDocument(rawContent, filePath);
  const wrapper = isPlainRecord(document) && isPlainRecord(document.payload) ? document : null;

  const section = pickString(options.section || wrapper?.section);
  const version = pickString(options.version || wrapper?.version);
  const notes = pickString(options.notes || wrapper?.notes);
  const schemaVersion = pickString(options.schemaVersion || wrapper?.schemaVersion);
  const payload = wrapper ? wrapper.payload : document;

  if (!section) {
    throw new Error('--section is required unless the JSON file includes section.');
  }

  if (!version) {
    throw new Error('--version is required unless the JSON file includes version.');
  }

  return {
    section,
    version,
    payload,
    ...(notes ? { notes } : {}),
    ...(schemaVersion ? { schemaVersion } : {})
  };
}

async function parseJsonResponse(response, endpoint) {
  const text = await response.text();
  const contentType = response.headers?.get?.('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${endpoint} returned non-JSON HTTP ${response.status}. Cloudflare Access auth is probably missing or expired.`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${endpoint} returned invalid JSON.`);
  }
}

function createUrl(siteUrl, endpoint) {
  return `${normalizeSiteUrl(siteUrl)}${endpoint}`;
}

export function createAdminPublicContentClient({ siteUrl = DEFAULT_SITE_URL, fetchImpl = fetch, headers = {} } = {}) {
  async function post(endpoint, body) {
    const response = await fetchImpl(createUrl(siteUrl, endpoint), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    return {
      status: response.status,
      body: await parseJsonResponse(response, endpoint)
    };
  }

  return {
    preview(body) {
      return post(PREVIEW_ENDPOINT, body);
    },
    publish(body) {
      return post(PUBLISH_ENDPOINT, body);
    }
  };
}

export function assertPreviewAllowsPublish(previewBody) {
  if (!previewBody?.ok) {
    throw new Error(`Preview failed: ${previewBody?.error?.code || 'UNKNOWN_PREVIEW_ERROR'}`);
  }

  const data = previewBody.data;
  if (!data?.valid || data?.wouldPublish !== true) {
    const reasons = Array.isArray(data?.blockingReasons) ? data.blockingReasons.join(', ') : 'unknown';
    throw new Error(`Preview blocked publish: ${reasons || 'unknown'}`);
  }

  if (!data.payloadHash || typeof data.payloadHash !== 'string') {
    throw new Error('Preview response did not include payloadHash.');
  }

  return data;
}

export function assertPublishConfirmation(options, previewData) {
  if (!options.publish) {
    return;
  }

  if (options.confirmVersion !== previewData.version) {
    throw new Error('--confirm-version must exactly match the preview version before publishing.');
  }

  if (options.confirmHash !== previewData.payloadHash) {
    throw new Error('--confirm-hash must exactly match the preview payloadHash before publishing.');
  }
}

function printJson(label, value) {
  console.log(`\n${label}`);
  console.log(JSON.stringify(value, null, 2));
}

export async function runControlledPublicContentPublish(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const options = parseCliArgs(argv);

  if (options.help) {
    printUsage();
    return { ok: true, skipped: true };
  }

  const requestBody = await buildPublicContentRequest(options, deps);
  const headers = buildAccessHeaders(env);

  if (!hasAccessAuth(headers)) {
    throw new Error('Cloudflare Access auth is required. Set CF_ACCESS_JWT_ASSERTION, CF_AUTHORIZATION_COOKIE, ADMIN_AUTHORIZATION_BEARER, or CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET.');
  }

  const client = createAdminPublicContentClient({
    siteUrl: options.siteUrl,
    fetchImpl: deps.fetchImpl || fetch,
    headers
  });

  const preview = await client.preview(requestBody);
  printJson('--- preview result ---', preview.body);

  const previewData = assertPreviewAllowsPublish(preview.body);

  if (!options.publish) {
    console.log('\nDry-run only. No publish request was sent.');
    console.log(`To publish, rerun with: --publish --confirm-version ${previewData.version} --confirm-hash ${previewData.payloadHash}`);
    return { ok: true, published: false, preview: preview.body };
  }

  assertPublishConfirmation(options, previewData);

  const publish = await client.publish(requestBody);
  printJson('--- publish result ---', publish.body);

  if (!publish.body?.ok) {
    throw new Error(`Publish failed: ${publish.body?.error?.code || 'UNKNOWN_PUBLISH_ERROR'}`);
  }

  return { ok: true, published: true, preview: preview.body, publish: publish.body };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runControlledPublicContentPublish().catch((error) => {
    console.error(`\n[admin-public-content-publish] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
