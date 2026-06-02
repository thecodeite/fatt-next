import styles from './page.module.css';
import { PageHeader } from '@/components/page-header';
import { cookies } from 'next/headers';
import Link from 'next/link';

const oathId = process.env.OAUTH_ID;

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost:3000';
const callbackUrl = vercelUrl?.includes('localhost')
  ? `http://${vercelUrl}/api/callback`
  : `https://${vercelUrl}/api/callback`;

export default async function Home() {
  const cookieStore = await cookies();
  const isLoggedIn =
    !!cookieStore.get('access_token') || !!cookieStore.get('refresh_token');

  const href = `https://api.freeagent.com/v2/approve_app?client_id=${oathId}&response_type=code&redirect_uri=${callbackUrl}`;
  return (
    <main className={styles.main}>
      <PageHeader />
      <div>
        {isLoggedIn ? (
          <Link href="/app/month">Go to app</Link>
        ) : (
          <a href={href}>Login</a>
        )}
      </div>
    </main>
  );
}
