'use server';
import {
  ExpensesResponse,
  freeagentGet,
  freeagentGetAll,
  ProjectsResponse,
  TaskResponse,
  TasksResponse,
  TimeslipResponse,
} from '@/freeagent';
import { getOfficeTrips, OfficeTrip } from '@/app/actions';
import dayjs from 'dayjs';
import { TimeslipDate } from './date';
import { ClientPage } from './client-page';
import { getFattSettings } from '@/fatt-settings';

export default async function Home({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const firstDay = dayjs(`${month}-01`);
  const prefixDays = (firstDay.day() + 6) % 7;
  const daysInMonth = firstDay.daysInMonth();
  const weeks = Math.ceil((prefixDays + daysInMonth) / 7);
  const daysOnScreen = weeks * 7;
  const calendarStart = firstDay.add(-prefixDays, 'day');
  const calendarEnd = calendarStart.add(daysOnScreen, 'day');

  const fattSettings = await getFattSettings();

  const requestUrl = `/v2/timeslips?from_date=${calendarStart.format(
    'YYYY-MM-DD'
  )}&to_date=${calendarEnd.format('YYYY-MM-DD')}&view=all`;
  const timeslipResponses = await freeagentGetAll<TimeslipResponse>(requestUrl);
  const timeslips = timeslipResponses.flatMap((response) => response.timeslips);

  const expenseResponses = await freeagentGetAll<ExpensesResponse>(
    '/v2/expenses',
    new URLSearchParams({
      from_date: calendarStart.format('YYYY-MM-DD'),
      to_date: calendarEnd.format('YYYY-MM-DD'),
      view: 'all',
    })
  );
  const allExpenses = expenseResponses.flatMap((r) => r.expenses);
  const mileageExpenses = allExpenses.filter(
    (e) => e.category === 'https://api.freeagent.com/v2/categories/249'
  );
  const travelExpenses = allExpenses.filter(
    (e) =>
      e.category === 'https://api.freeagent.com/v2/categories/285' ||
      e.category === 'https://api.freeagent.com/v2/categories/365'
  );

  const dates = [...Array(daysOnScreen)].map((_, i) => {
    const date = calendarStart.add(i, 'day');
    const key = date.format('YYYY-MM-DD');

    const timeslipDate: TimeslipDate = {
      key,
      date: date.toDate(),
      inside: date.month() === firstDay.month(),
      passed: date.isBefore(dayjs()),
      isWeekend: date.day() === 0 || date.day() === 6,
      number: date.format('Do'),
      timeslips: timeslips.filter((t) => t.dated_on === key),
      mileageExpenses: mileageExpenses.filter((e) => e.dated_on === key),
      travelExpenses: travelExpenses.filter((e) => e.dated_on === key),
    };

    return timeslipDate;
  });

  const usedTasks = Array.from(
    new Set(timeslips.map((timeslip) => timeslip.task))
  );

  const activeTasks = await freeagentGet<TasksResponse>(
    `/v2/tasks?view=active`
  );
  const projects = await freeagentGet<ProjectsResponse>(`/v2/projects`);

  const unmatchedTaskUrls = usedTasks.filter(
    (taskUrl) => !activeTasks.tasks.some((task) => task.url === taskUrl)
  );

  const unMatchedTasks: TaskResponse[] = await Promise.all(
    unmatchedTaskUrls.map((taskUrl) => freeagentGet<TaskResponse>(taskUrl))
  );

  const tasks = [
    ...activeTasks.tasks,
    ...unMatchedTasks.map((response) => response.task),
  ];

  const eligibleProjects = projects.projects.filter((project) =>
    tasks.some((task) => task.project === project.url && task.is_billable)
  );

  const tripsByProject = await Promise.all(
    eligibleProjects.map((p) => getOfficeTrips(p.url))
  );
  const officeTrips: OfficeTrip[] = tripsByProject.flat();

  return (
    <main>
      <ClientPage
        firstOfMonth={month}
        tasks={tasks}
        projects={projects.projects}
        dates={dates}
        fattSettings={fattSettings}
        officeTrips={officeTrips}
      />
    </main>
  );
}
