'use server';
import {
  FreeagentContactResponse,
  freeagentGet,
  FreeagentNote,
  freeagentGetAll,
  FreeagentNotesResponse,
  FreeagentContact,
} from '@/freeagent';
import styles from './page.module.css';
import {
  createContact,
  createNote,
  setCookie,
  setDefaultSettings,
} from './actions';
import { cookies } from 'next/headers';

enum RegistrationProgress {
  Unregistered = 0,
  ContactCreated = 1,
  NoteCreated = 2,
  SettingsCreated = 3,
  CookieSet = 4,
}

const RegistrationProgressNames: Record<RegistrationProgress, string> = {
  [RegistrationProgress.Unregistered]: 'Unregistered',
  [RegistrationProgress.ContactCreated]: 'ContactCreated',
  [RegistrationProgress.NoteCreated]: 'NoteCreated',
  [RegistrationProgress.SettingsCreated]: 'SettingsCreated',
  [RegistrationProgress.CookieSet]: 'CookieSet',
};

export default async function TasksPage({}: {}) {
  const cookieStore = await cookies();

  // let progress: RegistrationProgress = RegistrationProgress.Unregistered;
  const progress = {
    step: RegistrationProgress.Unregistered,
    contact: undefined as undefined | FreeagentContact,
    note: undefined as undefined | FreeagentNote,
    setting: undefined as undefined | object,
    existingCookie: cookieStore.get('noteUrl')?.value,
  };

  const contactsResponse = await freeagentGet<FreeagentContactResponse>(
    `/v2/contacts?view=all`
  );

  const fattContact = contactsResponse.contacts.find(
    (contact) => contact.organisation_name === 'Fatt'
  );

  // let note: FreeagentNote | undefined = undefined;
  if (fattContact) {
    progress.step = RegistrationProgress.ContactCreated;
    progress.contact = fattContact;

    const contactSearchParams = new URLSearchParams([
      ['contact', fattContact.url],
    ]);

    const notesResponse = await freeagentGetAll<FreeagentNotesResponse>(
      '/v2/notes',
      contactSearchParams
    );
    const note = notesResponse?.[0].notes?.[0];
    if (note) {
      progress.step = RegistrationProgress.NoteCreated;
      progress.note = note;

      try {
        const settings = JSON.parse(note.note);

        if (settings) {
          progress.step = RegistrationProgress.SettingsCreated;
          progress.setting = settings;

          if (progress.existingCookie === note.url) {
            progress.step = RegistrationProgress.CookieSet;
          }
        }
      } catch (e) {
        console.error('error parsing note:', e);
      }
    }
  }

  return (
    <main className={styles.main}>
      <pre>progress: {RegistrationProgressNames[progress.step]}</pre>
      {progress.step === RegistrationProgress.Unregistered ? (
        <form action={createContact}>
          <button type="submit">Create Contact</button>
        </form>
      ) : null}
      {progress.step === RegistrationProgress.ContactCreated ? (
        <form action={createNote}>
          <button type="submit">Create Note</button>
        </form>
      ) : null}
      {progress.step === RegistrationProgress.NoteCreated ? (
        <form action={setDefaultSettings}>
          <button type="submit">Set default settings</button>
          <input type="hidden" name="noteUrl" value={progress.note?.url} />
        </form>
      ) : null}
      {progress.step === RegistrationProgress.SettingsCreated ? (
        <form action={setCookie}>
          <button type="submit">Set cookie</button>
          <input type="hidden" name="noteUrl" value={progress.note?.url} />
        </form>
      ) : null}
      <pre>progress: {JSON.stringify(progress, null, 2)}</pre>
    </main>
  );
}
