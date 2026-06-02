'use server';
import { FattSettings } from '@/fatt-settings';
import {
  FreeagentCreateContact,
  FreeagentContactResponse,
  freeagentPost,
  freeagentPut,
} from '@/freeagent';
import { cookies } from 'next/headers';

export async function createContact() {
  'use server';

  const createContactRequest: FreeagentCreateContact = {
    contact: {
      organisation_name: 'Fatt',
      contact_name: 'Fatt',
    },
  };

  const p = await freeagentPost<FreeagentContactResponse>(
    `/v2/contacts?view=all`,
    createContactRequest
  );
  console.log('created contact:', p);
}

export async function createNote() {
  throw new Error('Not implemented');
}

export async function setDefaultSettings(formData: FormData) {
  'use server';
  const defaultSettings: FattSettings = {
    tasks: {},
  };

  const noteUrl = formData.get('noteUrl');

  if (typeof noteUrl !== 'string') {
    throw new Error('noteId is not a string');
  }

  const setDefaultSettingsRequest = {
    note: {
      note: JSON.stringify(defaultSettings),
    },
  };

  const p = await freeagentPut(noteUrl, setDefaultSettingsRequest);

  console.log('p:', p);
}

export async function setCookie(formData: FormData) {
  'use server';
  const defaultSettings: FattSettings = {
    tasks: {},
  };

  const noteUrl = formData.get('noteUrl');

  if (typeof noteUrl !== 'string') {
    throw new Error('noteId is not a string');
  }

  const cookieStore = await cookies();
  cookieStore.set('noteUrl', noteUrl);
}
