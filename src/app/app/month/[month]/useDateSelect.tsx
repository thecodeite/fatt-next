import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
dayjs.extend(advancedFormat);
import { useState } from 'react';

export function useDateSelect() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const inRange = (date: string): 'no' | 'range' | 'single' => {
    if (!startDate || !endDate) {
      return 'no';
    }

    if (startDate === endDate) {
      return date === startDate ? 'single' : 'no';
    }

    const day = dayjs(date);
    const isWeekend = day.day() === 0 || day.day() === 6;

    if (date >= startDate && date <= endDate && !isWeekend) {
      return 'range';
    }
    return 'no';
  };

  const dayCount = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  const datesArray = Array.from({ length: dayCount }, (_, i) =>
    dayjs(startDate).add(i, 'day').format('YYYY-MM-DD')
  );

  const selectedDates = datesArray.filter((date) => inRange(date) !== 'no');

  const datesDescription = formatDates(selectedDates);
  return {
    datesDescription,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    inRange,
    datesArray,
    selectedDates,
  } as const;
}

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return '';
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (start.isSame(end, 'day')) {
    return start.format('Do');
  }

  if (start.isSame(end, 'month')) {
    return `${start.format('Do')} - ${end.format('Do')}`;
  }

  if (start.isSame(end, 'year')) {
    return `${start.format('Do MMM')} - ${end.format('Do MMM')}`;
  }

  return `${start.format('Do MMM YYYY')} - ${end.format('Do MMM YYYY')}`;
}

function formatDates(dates: string[]) {
  if (dates.length === 0) {
    return '';
  }

  if (dates.length === 1) {
    return dayjs(dates[0]).format('Do MMM YYYY');
  }

  const groupedWhereContiguous = dates.reduce((acc, date) => {
    const lastGroup = acc[acc.length - 1];
    const lastDate = lastGroup ? lastGroup[lastGroup.length - 1] : null;

    if (lastDate && dayjs(date).diff(dayjs(lastDate), 'day') === 1) {
      lastGroup.push(date);
    } else {
      acc.push([date]);
    }

    return acc;
  }, [] as string[][]);

  return formatEnglishList(groupedWhereContiguous.map(formatContiguousDates));
}

function formatContiguousDates(dates: string[]) {
  if (dates.length === 0) {
    return '';
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  return formatDateRange(start, end);
}

function formatEnglishList(items: string[]) {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
