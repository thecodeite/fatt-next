import type { Metadata } from 'next';
import { Figtree } from 'next/font/google';
import './globals.css';
import './atoms.css';
import './global-icon.css';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import { cn } from './utils/cn';
import styles from './layout.module.css';

dayjs.extend(advancedFormat);

const figtree = Figtree({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fatt',
  description: 'FreeAgent Time Tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className={cn(figtree.className, styles.body)}>{children}</body>
    </html>
  );
}
