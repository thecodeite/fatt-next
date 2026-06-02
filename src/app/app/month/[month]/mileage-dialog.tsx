'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FreeagentProject } from '@/freeagent';
import { FattSettings } from '@/fatt-settings';
import { createMileageExpense, saveMileageDestination } from '@/app/actions';
import styles from './page.module.css';

interface MileageDialogProps {
  date: string;
  eligibleProjects: FreeagentProject[];
  fattSettings: FattSettings;
  onClose: () => void;
}

export function MileageDialog({
  date,
  eligibleProjects,
  fattSettings,
  onClose,
}: MileageDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const destinationsListId = useId();

  const destinations = fattSettings.mileage?.destinations ?? {};

  const [projectUrl, setProjectUrl] = useState(eligibleProjects[0]?.url ?? '');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [startOdo, setStartOdo] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const calcEndOdo = (start: string, dist: string) => {
    const s = parseFloat(start);
    const d = parseFloat(dist);
    if (!isNaN(s) && !isNaN(d)) setEndOdo(Math.round(s + d).toString());
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    const known = destinations[value];
    if (known) {
      setDistance(known.defaultDistance.toString());
      calcEndOdo(startOdo, known.defaultDistance.toString());
    }
  };

  const handleDistanceChange = (value: string) => {
    setDistance(value);
    calcEndOdo(startOdo, value);
  };

  const handleStartOdoChange = (value: string) => {
    setStartOdo(value);
    calcEndOdo(value, distance);
  };

  const handleEndOdoChange = (value: string) => {
    setEndOdo(value);
    if (startOdo) {
      const endNum = parseFloat(value);
      const startNum = parseFloat(startOdo);
      if (!isNaN(endNum) && !isNaN(startNum) && endNum >= startNum) {
        setDistance((endNum - startNum).toString());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const distNum = parseFloat(distance);
    const startOdoNum = startOdo ? parseFloat(startOdo) : undefined;
    const endOdoNum = endOdo ? parseFloat(endOdo) : undefined;

    await createMileageExpense(
      date,
      projectUrl,
      destination,
      distNum,
      startOdoNum,
      endOdoNum
    );

    const known = destinations[destination];
    if (!known) {
      await saveMileageDestination(destination, distNum);
    } else if (known.defaultDistance !== distNum) {
      if (
        window.confirm(
          `Update saved distance for "${destination}" to ${distNum} miles?`
        )
      ) {
        await saveMileageDestination(destination, distNum);
      }
    }

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
        <h3 className={styles.mileageDialogTitle}>Log mileage — {date}</h3>

        {eligibleProjects.length > 1 && (
          <div className={styles.mileageField}>
            <label>Project</label>
            <select value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)}>
              {eligibleProjects.map((p) => (
                <option key={p.url} value={p.url}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.mileageField}>
          <label>Destination</label>
          <input
            list={destinationsListId}
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            placeholder="e.g. London Office"
            required
            autoFocus
          />
          <datalist id={destinationsListId}>
            {Object.keys(destinations).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <div className={styles.mileageField}>
          <label>Distance (miles)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={distance}
            onChange={(e) => handleDistanceChange(e.target.value)}
            required
          />
        </div>

        <div className={styles.mileageFieldRow}>
          <div className={styles.mileageField}>
            <label>Start odometer</label>
            <input
              type="number"
              min="0"
              value={startOdo}
              onChange={(e) => handleStartOdoChange(e.target.value)}
              placeholder="optional"
            />
          </div>
          <div className={styles.mileageField}>
            <label>End odometer</label>
            <input
              type="number"
              min="0"
              value={endOdo}
              onChange={(e) => handleEndOdoChange(e.target.value)}
              placeholder="optional"
            />
          </div>
        </div>

        <div className={styles.mileageActions}>
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} data-variant="primary">
            {submitting ? 'Saving…' : 'Log mileage'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
