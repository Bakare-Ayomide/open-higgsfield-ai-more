import './globals.css';

export const metadata = {
  title: 'Open Higgsfield AI',
  description: 'Generate AI images, videos, cinema shots, and Nano Banana multi-angle character sheets using 200+ models. Open-source alternative to Higgsfield AI.',
  openGraph: {
    title: 'Open Higgsfield AI',
    description: 'Generate AI images, videos, cinema shots, and Nano Banana multi-angle character sheets using 200+ models. Open-source alternative to Higgsfield AI.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
