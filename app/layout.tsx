import type { ReactNode } from 'react';
import './globals.css';
import { AppShell } from '../components/AppShell';
import { ToastProvider } from '../components/Toast';

export const metadata = {
  title: 'Jasmin Growth Engine',
  description: 'Contacts, audiences, and email campaigns for jasminshukla.com.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
