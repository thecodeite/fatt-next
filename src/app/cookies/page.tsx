import { cookies } from 'next/headers';

export default async function Cookies() {
  const cookieJar = await cookies();
  const allCookies = cookieJar.getAll();

  return (
    <main>
      <ul>
        {allCookies.map((cookie) => (
          <li key={cookie.name}>
            {cookie.name}: {cookie.value}
          </li>
        ))}
      </ul>
    </main>
  );
}
