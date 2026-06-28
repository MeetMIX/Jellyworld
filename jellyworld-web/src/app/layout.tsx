import './globals.css';
import { Urbanist } from 'next/font/google';

const urbanist = Urbanist({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
});

export const metadata = {
  title: 'JellyWorld - Premium Media Hub',
  description: 'Votre univers streaming sur mesure',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${urbanist.className} bg-[#07060b] text-[#f1f5f9] antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}