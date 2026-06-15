import { headers } from 'next/headers';

interface Tokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

const oathId = process.env.OAUTH_ID;
const oauthSecret = process.env.OAUTH_SECRET;

// function handleFreeagentError(errorText: string) {
//   let errorObject: unknown;

//   try {
//     errorObject = JSON.parse(errorText);
//   } catch (e) {
//     console.error('Error parsing errorText:', errorText);
//   }
// }

// function handleAccessTokenNotRecognised() {}

export async function refreshAccessTokens(
  refreshToken: string
): Promise<Tokens | undefined> {
  const r = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' + Buffer.from(`${oathId}:${oauthSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('Error:', body);
    throw new Error(body);
  }

  const tokens: Tokens = await r.json();

  console.log('tokens:', tokens);

  return tokens;
}

async function getAccessToken() {
  // const cookieStore = cookies();
  // const token = cookieStore.get('access_token')?.value;
  // return token;
  // console.log('headers:', Array.from(headers().entries()));
  const xAccessToken = (await headers()).get('x-access-token');
  return xAccessToken;
}

export async function freeagentGet<T>(path: string) {
  if (path.startsWith('http')) {
    const pathStart = path.indexOf('/v2/');
    path = path.substring(pathStart);
  }

  console.log(`freeagentGet path: ${path}`);
  const token = await getAccessToken();

  const r = await fetch(`https://api.freeagent.com/${path}`, {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('Error:', body);
    throw new Error(body);
  }

  return r.json() as T;
}

export async function freeagentGetAll<T>(
  path: string,
  query?: URLSearchParams
): Promise<T[]> {
  const generator = freeagentGetAllGen<T>(path, query);
  const results: T[] = [];

  for await (const result of generator) {
    results.push(result);
  }

  return results;
}

export async function* freeagentGetAllGen<T>(
  path: string,
  query?: URLSearchParams
) {
  if (path.startsWith('http')) {
    const pathStart = path.indexOf('/v2/');
    path = path.substring(pathStart);
  }

  console.log(`freeagentGet path: ${path}`);
  const token = await getAccessToken();

  let url = `https://api.freeagent.com/${path}` as string | undefined;

  if (query) {
    url += '?' + query.toString();
  }

  let pages = 0;
  while (url && pages++ < 10) {
    const r = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('Error:', body);
      throw new Error(body);
    }

    const t = (await r.json()) as T;
    yield t;

    const links = parseLinks(r.headers.get('link'));
    url = links['next'];

    console.log('links:', links);
  }
  return null;
}

function parseLinks(links: string | null) {
  console.log('links:', links);
  if (!links) {
    return {};
  }

  const linkMap: Record<string, string> = {};
  const parts = links.split(',');
  for (const part of parts) {
    const [url, rel] = part.split('; rel=');
    const urlMatch = url.match(/<(.*)>/);
    const relMatch = rel.match(/["'](.*)["']/);
    if (urlMatch && relMatch) {
      linkMap[relMatch[1]] = urlMatch[1];
    }
  }

  return linkMap;
}

export async function freeagentPost<T>(path: string, body: object) {
  if (path.startsWith('http')) {
    const pathStart = path.indexOf('/v2/');
    path = path.substring(pathStart);
  }

  console.log('body:', body);

  console.log(`freeagentPost path: ${path}`);
  const token = await getAccessToken();

  const r = await fetch(`https://api.freeagent.com/${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('Error:', body);
    throw new Error(body);
  }

  return r.json() as T;
}

export async function freeagentPut<T>(path: string, body: object) {
  if (path.startsWith('http')) {
    const pathStart = path.indexOf('/v2/');
    path = path.substring(pathStart);
  }

  console.log('body:', body);

  console.log(`freeagentPut path: ${path}`);
  const token = await getAccessToken();

  const r = await fetch(`https://api.freeagent.com/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('Error:', body);
    throw new Error(body);
  }

  return r.json() as T;
}

export async function freeagentDelete(path: string) {
  if (path.startsWith('http')) {
    const pathStart = path.indexOf('/v2/');
    path = path.substring(pathStart);
  }

  console.log(`freeagentDelete path: ${path}`);
  const token = await getAccessToken();

  const r = await fetch(`https://api.freeagent.com/${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('Error:', body);
    throw new Error(body);
  }

  return;
}

export interface FreeagentExpense {
  url: string;
  user: string;
  category: string;
  dated_on: string;
  currency: string;
  gross_value: string;
  mileage?: string;
  description?: string;
  project?: string;
}

export interface ExpensesResponse {
  expenses: FreeagentExpense[];
}

export interface CreateFreeagentTimeslip {
  task: string;
  user: string;
  project: string;
  dated_on: string;
  hours: string;
}

export interface TimeslipResponse {
  timeslips: FreeagentTimeslip[];
}

export interface FreeagentTimeslip {
  url: string;
  user: string;
  project: string;
  task: string;
  billed_on_invoice: string;
  dated_on: string;
  hours: string;
  updated_at: string;
  created_at: string;
}

export interface TasksResponse {
  tasks: FreeagentTask[];
}

export interface TaskResponse {
  task: FreeagentTask;
}

export interface FreeagentTask {
  url: string;
  project: string;
  name: string;
  is_billable: boolean;
  billing_rate: string;
  billing_period: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectsResponse {
  projects: FreeagentProject[];
}

export interface FreeagentProject {
  url: string;
  name: string;
  contact: string;
  contact_name: string;
  currency: string;
  created_at: string;
  updated_at: string;
  budget: number;
  is_ir35: false;
  status: string;
  budget_units: string;
  normal_billing_rate: string;
  hours_per_day: string;
  uses_project_invoice_sequence: boolean;
  billing_period: string;
  include_unbilled_time_in_profitability: boolean;
}

export interface FreeagentContactResponse {
  contacts: FreeagentContact[];
}

export interface FreeagentContact {
  url: string;
  organisation_name?: string;
  first_name?: string;
  last_name?: string;
  active_projects_count: string;
  created_at: string;
  updated_at: string;
  contact_name_on_invoices: boolean;
  country: string;
  charge_sales_tax: string;
  locale: string;
  account_balance: string;
  status: string;
  uses_contact_invoice_sequence: boolean;
  emails_invoices_automatically: boolean;
  emails_payment_reminders: boolean;
  emails_thank_you_notes: boolean;
  uses_contact_level_email_settings: boolean;
}

export interface FreeagentCreateContact {
  contact: {
    organisation_name?: string;
    contact_name?: string;
  };
}

export interface FreeagentCompany {
  url: string;
  subdomain: string;
  name: string;
}

export interface FreeagentCompanyResponse {
  company: FreeagentCompany;
}

export interface FreeagentNote {
  url: string;
  note: string;
  project?: string;
  created_at: string;
  updated_at: string;
}

export interface FreeagentNotesResponse {
  notes: FreeagentNote[];
}

export interface FreeagentNoteResponse {
  note: FreeagentNote;
}
