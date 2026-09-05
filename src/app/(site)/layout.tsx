import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { loadSettings } from '@/lib/site-data';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();

  return (
    <>
      <JsonLd settings={settings} />
      <Header menu={settings.menu} brandName={settings.brandName} ctaLabel={settings.ctaLabel} />
      <main>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
