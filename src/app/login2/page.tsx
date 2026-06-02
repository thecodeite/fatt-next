import { cookies } from 'next/headers';
import React from 'react';

export default async function Login2Page(props: {
  searchParams: {
    accessToken: string;
    refreshToken: string;
  };
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  async function handleSubmit(formData: FormData) {
    'use server';

    const cookieStore = await cookies();
    const accessToken = formData.get('accessToken') as string;
    const refreshToken = formData.get('refreshToken') as string;
    console.log('accessToken:', accessToken);
    console.log('refreshToken:', refreshToken);
    cookieStore.set('access_token', accessToken);
    cookieStore.set('refresh_token', refreshToken);
  }

  return (
    <div>
      <form action={handleSubmit}>
        <fieldset>
          <legend>Access Token:</legend>
          <div>Cookie: {accessToken}</div>
          <input
            type="text"
            name="accessToken"
            defaultValue={props.searchParams.accessToken}
            style={{ width: '100%' }}
          />
        </fieldset>
        <fieldset>
          <legend>Refresh Token:</legend>
          <div>Cookie: {refreshToken}</div>
          <input
            type="text"
            name="refreshToken"
            defaultValue={props.searchParams.refreshToken}
            style={{ width: '100%' }}
          />
        </fieldset>
        <div>
          /login2?refreshToken={refreshToken}&accessToken={accessToken}
        </div>
        <div>{JSON.stringify(props)}</div>
        <div>
          <input type="submit" value="Set" />
        </div>
      </form>
    </div>
  );
}
