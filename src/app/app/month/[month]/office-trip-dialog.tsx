'use client';

import { useEffect, useRef, useState } from 'react';
import { FreeagentProject } from '@/freeagent';
import { createOfficeTrip } from '@/app/actions';
import styles from './page.module.css';

type TimeOfDay = 'morning' | 'midday' | 'evening';

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Mid-day' },
  { value: 'evening', label: 'Evening' },
];

interface OfficeTripDialogProps {
  date: string;
  eligibleProjects: FreeagentProject[];
  onClose: () => void;
}

export function OfficeTripDialog({ date, eligibleProjects, onClose }: OfficeTripDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [projectUrl, setProjectUrl] = useState(eligibleProjects[0]?.url ?? '');
  const [startDate, setStartDate] = useState(date);
  const [startTime, setStartTime] = useState<TimeOfDay>('morning');
  const [endDate, setEndDate] = useState(date);
  const [endTime, setEndTime] = useState<TimeOfDay>('evening');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }
    setError('');
    setSubmitting(true);
    await createOfficeTrip(projectUrl, { startDate, startTime, endDate, endTime, description: description || undefined });
    setSubmitting(false);
    dialogRef.current?.close();
    onClose();
  };

  const handleCancel = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog ref={dialogRef} className={styles.mileageDialog} onCancel={handleCancel}>
      <form onSubmit={handleSubmit}>
        <h3 className={styles.mileageDialogTitle}>Log office trip</h3>

        {eligibleProjects.length > 1 && (
          <div className={styles.mileageField}>
            <label>Project</label>
            <select value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)}>
              {eligibleProjects.map((p) => (
                <option key={p.url} value={p.url}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.mileageFieldRow}>
          <div className={styles.mileageField}>
            <label>Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className={styles.mileageField}>
            <label>Start time</label>
            <select value={startTime} onChange={(e) => setStartTime(e.target.value as TimeOfDay)}>
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.mileageFieldRow}>
          <div className={styles.mileageField}>
            <label>End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <div className={styles.mileageField}>
            <label>End time</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value as TimeOfDay)}>
              {TIME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.mileageField}>
          <label>Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Visit office"
            autoFocus
          />
        </div>

        {error && <p style={{ color: '#be342b', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

        <div className={styles.mileageActions}>
          <button type="button" onClick={handleCancel}>Cancel</button>
          <button type="submit" disabled={submitting} data-variant="primary">
            {submitting ? 'Saving…' : 'Log trip'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
