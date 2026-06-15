'use client';
import { FreeagentProject, FreeagentTask } from '@/freeagent';
import { TimeslipDate, TimeslipDateWithClient } from './date';
import styles from './page.module.css';
import { TaskPicker } from './taskPicker';
import { Calendar } from './calendar';
import { useDateSelect } from './useDateSelect';
import { createTimeslips } from '@/app/actions';
import { useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { FattSettings } from '@/fatt-settings';

interface ClientPageProps {
  firstOfMonth: string;
  tasks: FreeagentTask[];
  projects: FreeagentProject[];
  dates: TimeslipDate[];
  fattSettings: FattSettings;
}

export function ClientPage({
  firstOfMonth,
  tasks,
  projects,
  dates,
  fattSettings,
}: ClientPageProps) {
  const { datesDescription, startDate, endDate, setStartDate, setEndDate, inRange, selectedDates } =
    useDateSelect();
  const [taskAndProject, setTaskAndProject] = useState('');
  const [hours, setHours] = useState('8');

  const [selectedTask, selectedProject] = taskAndProject.split('|');

  const datesWithClient: TimeslipDateWithClient[] = dates.map((date) => {
    const isSelected = inRange(date.key);

    return {
      ...date,
      isSelected,
    };
  });

  const eligibleProjects = projects.filter((project) =>
    tasks.some((task) => task.project === project.url && task.is_billable)
  );

  const thisMonth = dayjs(firstOfMonth);
  const lastMonth = thisMonth.subtract(1, 'month');
  const nextMonth = thisMonth.add(1, 'month');

  return (
    <>
      <nav className={styles.navBar}>
        <Link href={`/app/month/${lastMonth.format('YYYY-MM')}`}>
          <span className="symbol">◀</span>
          {lastMonth.format('MMM YYYY')}
        </Link>
        <a className={styles.center}>{thisMonth.format('MMM YYYY')}</a>
        <Link href={`/app/month/${nextMonth.format('YYYY-MM')}`}>
          {nextMonth.format('MMM YYYY')} <span className="symbol">▶</span>
        </Link>
      </nav>
      <div className={styles.actionBar}>
        <TaskPicker
          tasks={tasks}
          projects={projects}
          value={taskAndProject}
          onChange={setTaskAndProject}
          fattSettings={fattSettings}
        />
        <select
          className={styles.newEntry}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        >
          <option value="8.0">8 hours</option>
          <option value="4.0">4 hours</option>
          <option value="2.0">2 hours</option>
        </select>
        <button
          className={styles.newEntry}
          onClick={() => {
            createTimeslips(
              selectedDates,
              selectedTask,
              selectedProject,
              hours
            );
          }}
          disabled={selectedDates.length === 0}
          data-variant="primary"
        >
          {datesDescription
            ? `Add ${parseFloat(hours)} hours to ${datesDescription}`
            : 'Select a date'}
        </button>
      </div>
      <Calendar
        tasks={tasks}
        dates={datesWithClient}
        setStartDate={setStartDate}
        setEndDate={setEndDate}
        fattSettings={fattSettings}
        eligibleProjects={eligibleProjects}
        selectionStart={startDate}
        selectionEnd={endDate}
      />
    </>
  );
}
