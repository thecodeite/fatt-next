'use server';

import {
  CreateFreeagentTimeslip,
  ExpensesResponse,
  FreeagentNotesResponse,
  freeagentDelete,
  freeagentGetAll,
  freeagentPost,
  freeagentPut,
} from '@/freeagent';

export interface OfficeTrip {
  startDate: string;
  startTime: 'morning' | 'midday' | 'evening';
  endDate: string;
  endTime: 'morning' | 'midday' | 'evening';
  description?: string;
  noteUrl: string;
}

const FATT_TRIP_PREFIX = 'fatt:trip';

function serializeTrip(trip: Omit<OfficeTrip, 'noteUrl'>): string {
  const lines = [
    FATT_TRIP_PREFIX,
    `Start: ${trip.startDate} ${trip.startTime}`,
    `End: ${trip.endDate} ${trip.endTime}`,
  ];
  if (trip.description) lines.push(`Description: ${trip.description}`);
  return lines.join('\n');
}

function deserializeTrip(noteUrl: string, body: string): OfficeTrip | null {
  const lines = body.split('\n');
  if (lines[0] !== FATT_TRIP_PREFIX) return null;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(': ');
    if (idx !== -1) fields[line.slice(0, idx)] = line.slice(idx + 2);
  }
  const [startDate, startTime] = (fields['Start'] ?? '').split(' ');
  const [endDate, endTime] = (fields['End'] ?? '').split(' ');
  if (!startDate || !startTime || !endDate || !endTime) return null;
  return {
    noteUrl,
    startDate,
    startTime: startTime as OfficeTrip['startTime'],
    endDate,
    endTime: endTime as OfficeTrip['endTime'],
    description: fields['Description'],
  };
}
import dayjs from 'dayjs';
import { getFattSettings, saveFattSettings } from '@/fatt-settings';

import { revalidatePath } from 'next/cache';

export async function createTimeslips(
  dates: string[],
  task: string,
  project: string,
  hours: string
) {
  const timeslips: CreateFreeagentTimeslip[] = dates.map((date) => {
    const timeslip: CreateFreeagentTimeslip = {
      task,
      user: 'https://api.freeagent.com/v2/users/91067',
      project,
      dated_on: date,
      hours,
    };

    return timeslip;
  });

  const body = {
    timeslips,
  };

  await freeagentPost('/v2/timeslips', body);

  await revalidatePath('/v2/timeslips');
}

export async function createMileageExpense(
  date: string,
  projectUrl: string,
  destination: string,
  distance: number,
  startOdo?: number,
  endOdo?: number
) {
  const description =
    startOdo != null && endOdo != null
      ? `${destination} | odo: ${startOdo}→${endOdo}`
      : destination;

  await freeagentPost('/v2/expenses', {
    expense: {
      user: 'https://api.freeagent.com/v2/users/91067',
      category: 'https://api.freeagent.com/v2/categories/249',
      dated_on: date,
      gross_value: '0.0',
      currency: 'GBP',
      mileage: distance.toString(),
      vehicle_type: 'Car',
      engine_type: 'Petrol',
      engine_size: '1401-2000cc',
      reclaim_mileage: true,
      project: projectUrl,
      description,
    },
  });

  await revalidatePath('/', 'layout');
}

export async function saveMileageDestination(name: string, distance: number) {
  const current = await getFattSettings();
  await saveFattSettings({
    ...current,
    mileage: {
      vehicleType: 'Car',
      engineType: 'Petrol',
      engineSize: '1401-2000cc',
      ...(current.mileage ?? {}),
      destinations: {
        ...(current.mileage?.destinations ?? {}),
        [name]: { defaultDistance: distance },
      },
    },
  });
}

export async function getTravelExpenseDescriptions(): Promise<string[]> {
  const from = dayjs().subtract(24, 'month').format('YYYY-MM-DD');
  const responses = await freeagentGetAll<ExpensesResponse>(
    '/v2/expenses',
    new URLSearchParams({ from_date: from, view: 'all' })
  );
  const descriptions = responses
    .flatMap((r) => r.expenses)
    .filter(
      (e) =>
        e.category === 'https://api.freeagent.com/v2/categories/285' ||
        e.category === 'https://api.freeagent.com/v2/categories/365'
    )
    .map((e) => e.description ?? '')
    .filter(Boolean);
  return [...new Set(descriptions)];
}

export async function createTravelExpense(
  date: string,
  projectUrl: string,
  categoryUrl: string,
  description: string,
  amount: number
) {
  await freeagentPost('/v2/expenses', {
    expense: {
      user: 'https://api.freeagent.com/v2/users/91067',
      category: categoryUrl,
      dated_on: date,
      gross_value: (-amount).toString(),
      currency: 'GBP',
      description,
      project: projectUrl,
    },
  });

  await revalidatePath('/', 'layout');
}

export async function getOfficeTrips(projectUrl: string): Promise<OfficeTrip[]> {
  const pages = await freeagentGetAll<FreeagentNotesResponse>(
    '/v2/notes',
    new URLSearchParams({ project: projectUrl })
  );
  return pages
    .flatMap((p) => p.notes)
    .map((n) => deserializeTrip(n.url, n.note))
    .filter((t): t is OfficeTrip => t !== null);
}

export async function createOfficeTrip(
  projectUrl: string,
  trip: Omit<OfficeTrip, 'noteUrl'>
): Promise<void> {
  await freeagentPost(`/v2/notes?project=${encodeURIComponent(projectUrl)}`, {
    note: {
      note: serializeTrip(trip),
    },
  });
  await revalidatePath('/', 'layout');
}

export async function updateTimeslip(url: string, newValue: string) {
  if (newValue === 'delete') {
    await freeagentDelete(url);
  } else {
    await freeagentPut(url, { hours: newValue });
  }

  await revalidatePath('/v2/timeslips');
}
