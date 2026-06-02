'use server';

import dayjs from 'dayjs';
import { redirect } from 'next/navigation';

const ThisMonthPage = async () => {
  const today = dayjs();
  const month = today.format('YYYY-MM');

  return redirect(`/app/month/${month}`);
};

export default ThisMonthPage;
