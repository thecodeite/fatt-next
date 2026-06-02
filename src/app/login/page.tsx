import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '../../components/atoms/dialog';
import { freeagentGet } from '@/freeagent';
import Link from 'next/link';

// 58XDKG7_wWAD-YVcJ0v5KQ
const oathId = process.env.OAUTH_ID;

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost:3000';
const callbackUrl = vercelUrl?.includes('localhost')
  ? `http://${vercelUrl}/api/callback`
  : `https://${vercelUrl}/api/callback`;

interface NameResponse {
  user: {
    first_name: string;
    last_name: string;
  };
}

export default async function LoginPage() {
  const href = `https://api.freeagent.com/v2/approve_app?client_id=${oathId}&response_type=code&redirect_uri=${callbackUrl}`;

  const nameResponse = await freeagentGet<NameResponse>(`/v2/users/me`);

  if (nameResponse) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>
          <p>
            Logged in as {nameResponse.user.first_name}{' '}
            {nameResponse.user.last_name}
          </p>

          <div>
            <Link href="/app/month">View time sheets</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Dialog>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          <div data-vercelUrl={vercelUrl} data-callbackUrl={callbackUrl}>
            <a href={href}>Authenticate with Freeagent</a>
          </div>
        </DialogContent>
        <DialogActions>
          <button color="primary">Close</button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
