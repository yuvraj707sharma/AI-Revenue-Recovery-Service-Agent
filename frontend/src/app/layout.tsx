import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Razorpay AI Revenue Recovery Agent — Track 3',
  description: 'Autonomous zero-click-first subscription & mandate recovery engine for Razorpay AI Buildathon.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#061325] text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
