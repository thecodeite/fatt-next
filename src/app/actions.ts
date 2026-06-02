'use server';

import {
  CreateFreeagentTimeslip,
  freeagentDelete,
  freeagentPost,
  freeagentPut,
} from '@/freeagent';
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

export async function updateTimeslip(url: string, newValue: string) {
  if (newValue === 'delete') {
    await freeagentDelete(url);
  } else {
    await freeagentPut(url, { hours: newValue });
  }

  await revalidatePath('/v2/timeslips');
}
