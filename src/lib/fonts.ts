import { Geist, Geist_Mono } from 'next/font/google';

export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

/** Applied to <html> by every locale root layout, so both trees stay identical. */
export const fontVars = `${geistSans.variable} ${geistMono.variable} h-full antialiased`;
