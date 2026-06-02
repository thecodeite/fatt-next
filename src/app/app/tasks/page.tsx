import { freeagentGet, ProjectsResponse, TasksResponse } from '@/freeagent';
import styles from './page.module.scss';
import { Switch, SwitchContainer } from '@/components/atoms/switch';
import Link from 'next/link';
import React from 'react';
import {
  FattSettings,
  getFattSettings,
  saveFattSettings,
} from '@/fatt-settings';

export default async function Tasks({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const tasksArg = view === 'all' ? 'all' : 'active';
  const tasks = await freeagentGet<TasksResponse>(`/v2/tasks?view=${tasksArg}`);
  const projects = await freeagentGet<ProjectsResponse>(
    `/v2/projects?view=${tasksArg}`
  );

  const showAllTasks = view === 'all';

  const settings = await getFattSettings();

  const displayData = projects.projects
    .map((project) => {
      return {
        url: project.url,
        name: project.name,
        tasks: tasks.tasks
          .filter((task) => task.project === project.url)
          .map((task) => {
            const id = task.url.substring(task.url.lastIndexOf('/') + 1);
            return {
              id,
              url: task.url,
              name: task.name,
              short: settings.tasks?.[id]?.short || '',
              iconName: settings.tasks?.[id]?.iconName || '',
            };
          }),
      };
    })
    .filter((proj) => proj.tasks.length > 0);

  async function save(formData: FormData) {
    'use server';

    const data = Array.from(formData.entries());

    const settings: FattSettings = { tasks: {} };
    const tasks: FattSettings['tasks'] = settings.tasks || {};

    settings.tasks = data.reduce((acc, [key, value]) => {
      const [name, id] = key.split('-');
      if (!acc[id]) {
        acc[id] = {};
      }
      if (name === 'short') {
        acc[id].short = value as string;
      }
      if (name === 'iconName') {
        acc[id].iconName = value as string;
      }

      return acc;
    }, tasks);

    console.log('settings:', settings);

    await saveFattSettings(settings);
  }

  return (
    <main className={styles.main}>
      <SwitchContainer>
        <Link href="?view=active">Active</Link>
        <Switch checked={showAllTasks} />
        <Link href="?view=all">All</Link>
      </SwitchContainer>
      <form action={save}>
        <table className={styles.tasksTable}>
          <thead>
            <tr>
              <th>Task</th>
              <th>Short</th>
              <th>Icon</th>
            </tr>
          </thead>
          {displayData.map((project) => (
            <React.Fragment key={project.url}>
              <thead>
                <tr>
                  <th colSpan={3}>{project.name}</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((task) => (
                  <tr key={task.url}>
                    <td>{task.name}</td>
                    <td>
                      <input
                        name={`short-${task.id}`}
                        defaultValue={task.short}
                      />
                    </td>
                    <td>
                      <select
                        className="material-symbols-outlined"
                        name={`iconName-${task.id}`}
                        defaultValue={task.iconName}
                      >
                        <option value=""></option>
                        <option value="home">home</option>
                        <option value="apartment">apartment</option>
                        <option value="nights_stay">nights_stay</option>
                        <option value="beach_access">beach_access</option>
                        <option value="sick">sick</option>
                        <option value="contract">contract</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </React.Fragment>
          ))}
        </table>
        <button type="submit">Save</button>
      </form>
      <pre>{JSON.stringify({ displayData }, null, 2)}</pre>
      {/* <pre>{JSON.stringify(tasks, null, 2)}</pre> */}
      {/* <pre>{JSON.stringify(projects, null, 2)}</pre> */}
    </main>
  );
}

// function useTasks() {
//   const [fattContact, setFattContact] = useState<TasksResponse | null>(null);
// }
