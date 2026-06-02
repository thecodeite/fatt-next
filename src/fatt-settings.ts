import { cookies } from 'next/headers';
import { freeagentGet, FreeagentNoteResponse, freeagentPut } from './freeagent';

export interface FattSettings {
  tasks?: Record<string, { short?: string; iconName?: string }>;
  mileage?: {
    vehicleType: string;
    engineType: string;
    engineSize: string;
    destinations: Record<string, { defaultDistance: number }>;
  };
}

export async function getFattSettings(): Promise<FattSettings> {
  'use server';

  const cookieStore = await cookies();
  const noteUrl = cookieStore.get('noteUrl')?.value;

  if (!noteUrl) {
    return {};
    // throw new Error('noteUrl not found');
  }

  const body = await freeagentGet<FreeagentNoteResponse>(noteUrl);
  console.log('body:', body);
  return JSON.parse(body.note.note);
}

export async function saveFattSettings(settings: FattSettings) {
  'use server';

  const cookieStore = await cookies();
  const noteUrl = cookieStore.get('noteUrl')?.value;

  if (!noteUrl) {
    return {};
    throw new Error('noteUrl not found');
  }

  const body = {
    note: {
      note: JSON.stringify(settings),
    },
  };

  const p = await freeagentPut(noteUrl, body);
  console.log('p:', p);
}
