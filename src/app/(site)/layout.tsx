import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { loadSettings } from '@/lib/site-data';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();

  return (
    <>
      <Header menu={settings.menu} />
      <main>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
