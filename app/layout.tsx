import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Thermae Thraciae | Roman Thermal Atlas',
  description: 'A source-led atlas of Roman thermal sites in Thrace, with cited plans, real place images and archaeological evidence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
