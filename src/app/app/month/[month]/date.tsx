'use client';
import { getTaskName, getTaskIcon } from '@/taskMap';
import styles from './page.module.css';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { FreeagentExpense, FreeagentProject, FreeagentTask, FreeagentTimeslip } from '@/freeagent';
import { cn } from '@/app/utils/cn';
import { createTimeslips, deleteOfficeTrip, updateTimeslip } from '@/app/actions';
import { FattSettings } from '@/fatt-settings';
import { MileageDialog } from './mileage-dialog';
import { TravelExpenseDialog } from './travel-expense-dialog';
import { OfficeTripDialog } from './office-trip-dialog';
import { OfficeTrip } from '@/app/actions';

let closeCurrentMenu: (() => void) | null = null;

export interface TimeslipDate {
  key: string;
  date: Date;
  passed: boolean;
  isWeekend: boolean;
  inside: boolean;
  number: string;
  timeslips: FreeagentTimeslip[];
  mileageExpenses: FreeagentExpense[];
  travelExpenses: FreeagentExpense[];
  officeTrips: OfficeTrip[];
}

export type TimeslipDateWithClient = TimeslipDate & {
  isSelected: 'no' | 'single' | 'range';
};

interface DateProps {
  timeslipDate: TimeslipDateWithClient;
  setStartDate: Dispatch<SetStateAction<string>>;
  setEndDate: Dispatch<SetStateAction<string>>;
  small?: boolean;
  fattSettings: FattSettings;
  tasks: FreeagentTask[];
  eligibleProjects: FreeagentProject[];
  selectionStart: string;
  selectionEnd: string;
}

const TIME_OFFSETS: Record<OfficeTrip['startTime'], number> = {
  morning: 20,
  midday: 50,
  evening: 80,
};

function tripBarStyle(trip: OfficeTrip, dayKey: string): React.CSSProperties {
  const isStart = trip.startDate === dayKey;
  const isEnd = trip.endDate === dayKey;
  const left = isStart ? TIME_OFFSETS[trip.startTime] : 0;
  const right = isEnd ? 100 - TIME_OFFSETS[trip.endTime] : 0;
  const rl = isStart ? '3px' : '0';
  const rr = isEnd ? '3px' : '0';
  return {
    marginLeft: `${left}%`,
    marginRight: `${right}%`,
    borderRadius: `${rl} ${rr} ${rr} ${rl}`,
  };
}

function calcColour(timeslipDate: TimeslipDateWithClient, totalHours: number) {
  if (timeslipDate.isWeekend || !timeslipDate.passed) {
    return undefined;
  } else {
    return totalHours < 8 ? styles.missingHours : styles.completeHours;
  }
}

export function Date({
  timeslipDate,
  setStartDate,
  setEndDate,
  small,
  fattSettings,
  tasks,
  eligibleProjects,
  selectionStart,
  selectionEnd,
}: DateProps) {
  const [dragging, setDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [mileageOpen, setMileageOpen] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<OfficeTrip | null>(null);
  const rightClickedTripRef = useRef<OfficeTrip | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    closeCurrentMenu?.();
    setContextMenu({ x: e.clientX, y: e.clientY });
    closeCurrentMenu = () => { setContextMenu(null); rightClickedTripRef.current = null; };
  };

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('contextmenu', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);
  const totalHours = timeslipDate.timeslips.reduce(
    (total, timeslip) => total + parseFloat(timeslip.hours),
    0
  );

  const missingHours = calcColour(timeslipDate, totalHours);

  const startDragging = (e: React.DragEvent) => {
    console.log('startDragging');
    // e.preventDefault();
    e.dataTransfer.setData('text/plain', timeslipDate.key);
    setDragging(true);
    setStartDate(timeslipDate.key);
    setEndDate(timeslipDate.key);
  };

  const endDragging = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const dragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const dragEnter = (td: TimeslipDate) => (e: React.DragEvent) => {
    console.log('dragEnter');
    e.preventDefault();
    setEndDate(td.key);
  };

  const drop = (td: TimeslipDate) => (e: React.DragEvent) => {
    e.preventDefault();
    console.log('dropped on ' + td.date);
  };

  const click = () => {
    if (timeslipDate.isSelected === 'single') {
      setStartDate('');
      setEndDate('');
      return;
    }
    setStartDate(timeslipDate.key);
    setEndDate(timeslipDate.key);
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onDragOver={dragOver}
      onDragEnter={dragEnter(timeslipDate)}
      onDrop={drop(timeslipDate)}
      className={cn(
        styles.day,
        timeslipDate.isSelected !== 'no' ? styles.selected : undefined,
        dragging ? styles.dragging : undefined,
        small ? styles.smallWeekend : undefined
      )}
    >
      <div
        onClick={click}
        onDragStart={startDragging}
        onDragEnd={endDragging}
        draggable
      >
        {true && (
          <>
            {timeslipDate.officeTrips.length > 0 && (
              <TripStrip
                trips={timeslipDate.officeTrips}
                dayKey={timeslipDate.key}
                onEdit={(trip) => { setEditingTrip(trip); setTripOpen(true); }}
                onTripRightClick={(trip) => { rightClickedTripRef.current = trip; }}
              />
            )}
            <div
              className={cn(
                styles.dayBlockTop,
                timeslipDate.inside ? styles.inside : styles.outside
              )}
            >
              {small ? (
                <>
                  <div>{timeslipDate.number}</div>
                  <div>&nbsp;&nbsp;&nbsp;</div>
                </>
              ) : (
                <>
                  <div>{timeslipDate.number}</div>
                  <div>{totalHours}h</div>
                </>
              )}
            </div>
            <div
              className={cn(
                styles.dayBlockBottom,
                missingHours,
                small ? styles.smallWeekend : undefined
              )}
            >
              {small ? (
                <>{totalHours}h</>
              ) : (
                <>
                  {timeslipDate.timeslips.length === 0 ? (
                    <NoTimeslips />
                  ) : (
                    <Timeslips
                      timeslips={timeslipDate.timeslips}
                      fattSettings={fattSettings}
                      tasks={tasks}
                    />
                  )}
                  {timeslipDate.mileageExpenses.length > 0 && (
                    <div className={styles.mileageEntry}>
                      <span className="material-symbols-outlined">directions_car</span>
                      {timeslipDate.mileageExpenses
                        .reduce((sum, e) => sum + parseFloat(e.mileage ?? '0'), 0)
                        .toFixed(1)}mi
                    </div>
                  )}
                  {timeslipDate.travelExpenses.length > 0 && (
                    <div className={styles.mileageEntry}>
                      <span className="material-symbols-outlined">receipt_long</span>
                      {timeslipDate.travelExpenses.length} · £
                      {timeslipDate.travelExpenses
                        .reduce((sum, e) => sum + Math.abs(parseFloat(e.gross_value)), 0)
                        .toFixed(2)}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <div className={styles.contextMenuHeader}>Add 8h</div>
          {tasks.map((task) => (
            <button
              key={task.url}
              className={styles.contextMenuItem}
              onClick={() => {
                createTimeslips([timeslipDate.key], task.url, task.project, '8.0');
                setContextMenu(null);
                closeCurrentMenu = null;
              }}
            >
              {getTaskIcon(task, fattSettings)}
              {getTaskName(task, fattSettings)}
            </button>
          ))}
          {timeslipDate.timeslips.length > 0 && (
            <>
              <hr className={styles.contextMenuDivider} />
              <div className={styles.contextMenuHeader}>Delete</div>
              {timeslipDate.timeslips.map((timeslip) => (
                <button
                  key={timeslip.url}
                  className={styles.contextMenuItem}
                  onClick={() => {
                    updateTimeslip(timeslip.url, 'delete');
                    setContextMenu(null);
                    closeCurrentMenu = null;
                  }}
                >
                  {getTaskIcon(timeslip.task, fattSettings)}
                  {getTaskName(timeslip.task, fattSettings, tasks)}
                </button>
              ))}
            </>
          )}
          {rightClickedTripRef.current && (
            <>
              <hr className={styles.contextMenuDivider} />
              <div className={styles.contextMenuHeader}>Trip</div>
              <button
                className={styles.contextMenuItem}
                onClick={() => {
                  const trip = rightClickedTripRef.current!;
                  setContextMenu(null);
                  closeCurrentMenu = null;
                  deleteOfficeTrip(trip.noteUrl);
                }}
              >
                Delete trip
              </button>
            </>
          )}
          <hr className={styles.contextMenuDivider} />
          <div className={styles.contextMenuHeader}>Log…</div>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setContextMenu(null);
              closeCurrentMenu = null;
              setMileageOpen(true);
            }}
          >
            Log mileage…
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setContextMenu(null);
              closeCurrentMenu = null;
              setTravelOpen(true);
            }}
          >
            Log travel expense…
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setContextMenu(null);
              closeCurrentMenu = null;
              setEditingTrip(null);
              setTripOpen(true);
            }}
          >
            Log office trip…
          </button>
        </div>
      )}
      {mileageOpen && (
        <MileageDialog
          date={timeslipDate.key}
          eligibleProjects={eligibleProjects}
          fattSettings={fattSettings}
          onClose={() => setMileageOpen(false)}
        />
      )}
      {travelOpen && (
        <TravelExpenseDialog
          date={timeslipDate.key}
          eligibleProjects={eligibleProjects}
          onClose={() => setTravelOpen(false)}
        />
      )}
      {tripOpen && (
        <OfficeTripDialog
          date={timeslipDate.key}
          selectionStart={timeslipDate.isSelected !== 'no' ? selectionStart : undefined}
          selectionEnd={timeslipDate.isSelected !== 'no' ? selectionEnd : undefined}
          eligibleProjects={eligibleProjects}
          trip={editingTrip ?? undefined}
          onClose={() => { setTripOpen(false); setEditingTrip(null); }}
        />
      )}
    </div>
  );
}

function Timeslips({
  timeslips,
  fattSettings,
  tasks,
}: {
  timeslips: FreeagentTimeslip[];
  fattSettings: FattSettings;
  tasks: FreeagentTask[];
}) {
  const [hours, setHours] = useState(
    timeslips.map((timeslip) => timeslip.hours)
  );

  const changed = hours.some((hour, i) => hour !== timeslips[i].hours);

  const apply = async () => {
    const changed = timeslips
      .map((t, i) => ({ t, h: hours[i] }))
      .filter(({ t, h }) => t.hours !== h);
    for (const { t, h } of changed) {
      await updateTimeslip(t.url, h);
    }
  };
  const cancel = () => {
    setHours(timeslips.map((timeslip) => timeslip.hours));
  };

  return (
    <>
      {timeslips.map((timeslip, i) => (
        <div className={styles.timeslip} key={timeslip.url}>
          <div className={styles.timeslipName}>
            {getTaskIcon(timeslip.task, fattSettings)}{' '}
            {getTaskName(timeslip.task, fattSettings, tasks)}
          </div>
          <select
            className={styles.clearSelect}
            value={hours[i]}
            onChange={(e) =>
              setHours(
                hours.map((hour, j) => (i === j ? e.target.value : hour))
              )
            }
          >
            <option value="8.0">8h</option>
            <option value="4.0">4h</option>
            <option value="2.0">2h</option>
            <optgroup label="---"></optgroup>
            <option value="delete">⌫</option>
          </select>
        </div>
      ))}
      {changed && (
        <div className={styles.timeslip}>
          <button onClick={() => cancel()}>Cancel</button>
          <button onClick={() => apply()}>Apply</button>
        </div>
      )}
    </>
  );
}

function TripStrip({ trips, dayKey, onEdit, onTripRightClick }: { trips: OfficeTrip[]; dayKey: string; onEdit: (trip: OfficeTrip) => void; onTripRightClick: (trip: OfficeTrip) => void }) {
  const [hovered, setHovered] = useState<{ trip: OfficeTrip; x: number; y: number } | null>(null);

  const sorted = [...trips].sort((a, b) =>
    a.startDate !== b.startDate
      ? a.startDate < b.startDate ? -1 : 1
      : a.endDate > b.endDate ? -1 : 1
  );

  return (
    <div className={styles.tripStrip}>
      {sorted.map((trip) => (
        <div
          key={trip.noteUrl}
          className={styles.tripBar}
          style={tripBarStyle(trip, dayKey)}
          onClick={(e) => { e.stopPropagation(); onEdit(trip); }}
          onContextMenu={() => onTripRightClick(trip)}
          onMouseEnter={(e) => setHovered({ trip, x: e.clientX, y: e.clientY })}
          onMouseMove={(e) => setHovered((h) => h ? { ...h, x: e.clientX, y: e.clientY } : null)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {hovered && (
        <div
          className={styles.tripHover}
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          {hovered.trip.description && (
            <div className={styles.tripHoverTitle}>{hovered.trip.description}</div>
          )}
          <div className={styles.tripHoverRow}>
            From: {hovered.trip.startDate} {hovered.trip.startTime}
          </div>
          <div className={styles.tripHoverRow}>
            To: {hovered.trip.endDate} {hovered.trip.endTime}
          </div>
        </div>
      )}
    </div>
  );
}

function NoTimeslips() {
  return <div className={styles.noTimeslips}>No timeslips</div>;
}
