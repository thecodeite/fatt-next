'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FreeagentProject } from '@/freeagent';
import { createTravelExpense, getTravelExpenseDescriptions } from '@/app/actions';
import styles from './page.module.css';

const CATEGORIES = [
  { label: 'Accommodation & Meals', url: 'https://api.freeagent.com/v2/categories/285' },
  { label: 'Travel', url: 'https://api.freeagent.com/v2/categories/365' },
] as const;

interface TravelExpenseDialogProps {
  date: string;
  eligibleProjects: FreeagentProject[];
  onClose: () => void;
}

export function TravelExpenseDialog({
  date,
  eligibleProjects,
  onClose,
}: TravelExpenseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const descriptionsListId = useId();

  const [projectUrl, setProjectUrl] = useState(eligibleProjects[0]?.url ?? '');
  const [categoryUrl, setCategoryUrl] = useState<string>(CATEGORIES[0].url);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    dialogRef.current?.showModal();
    getTravelExpenseDescriptions().then(setSuggestions);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await createTravelExpense(date, projectUrl, categoryUrl, description, parseFloat(amount));
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
        <h3 className={styles.mileageDialogTitle}>Log travel expense — {date}</h3>

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
          <label>Category</label>
          <select value={categoryUrl} onChange={(e) => setCategoryUrl(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.url} value={c.url}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.mileageField}>
          <label>Description</label>
          <input
            list={descriptionsListId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Hotel — Manchester"
            required
            autoFocus
          />
          <datalist id={descriptionsListId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div className={styles.mileageField}>
          <label>Amount (£)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className={styles.mileageActions}>
          <button type="button" onClick={handleCancel}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} data-variant="primary">
            {submitting ? 'Saving…' : 'Log expense'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
