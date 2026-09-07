import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { JsonLd } from '@/components/site/JsonLd';
import { PickedDatesProvider } from '@/components/site/PickedDates';
import { Metrika } from '@/components/site/Metrika';
import { loadSettings } from '@/lib/site-data';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();

  return (
    /* Провайдер держит даты, выбранные в календаре занятости, — их читает
       форма заявки, где бы она ни стояла. */
    <PickedDatesProvider>
      <JsonLd settings={settings} />
      <Header menu={settings.menu} brandName={settings.brandName} ctaLabel={settings.ctaLabel} />
      <main>{children}</main>
      <Footer settings={settings} />
      {/* Счётчик только на публичных страницах: посещения панели владельцем
          в статистике сайта — мусор. */}
      <Metrika id={settings.metrikaId} />
    </PickedDatesProvider>
  );
}
