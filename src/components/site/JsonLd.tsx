import type { SiteSettings } from '@/lib/site-data';
import { siteUrl } from '@/lib/site-url';

/* Разметка для поисковиков: Яндекс и Google показывают по ней адрес, телефон
   и координаты прямо в выдаче. Отдаём одним объектом на весь сайт из layout. */
export function JsonLd({ settings }: { settings: SiteSettings }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: settings.legalName,
    /* Люди ищут это место разными словами: «база отдыха Рыбачий», «турбаза
       Рыбачий». Синонимы в разметке помогают поисковику связать их с одной
       организацией — в отличие от набивки теми же словами в текст. */
    alternateName: ['Турбаза «Север» на Рыбачьем', 'База отдыха на полуострове Рыбачий'],
    description: settings.seoDescription,
    url: siteUrl(),
    telephone: settings.phone,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressRegion: 'Мурманская область',
      addressLocality: 'полуостров Рыбачий',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: settings.lat,
      longitude: settings.lng,
    },
    /* Где база работает и откуда забирает гостей: запрос «на Рыбачий из
       Мурманска» встречается чаще, чем сам полуостров. */
    areaServed: [
      { '@type': 'Place', name: 'Полуостров Рыбачий' },
      { '@type': 'Place', name: 'Мурманская область' },
      { '@type': 'Place', name: 'Териберка' },
    ],
    sameAs: [settings.vk, settings.telegram, settings.reviewsUrl].filter(Boolean),
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Баня', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Питание', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Трансфер на вездеходе', value: true },
    ],
  };

  return (
    <script
      type="application/ld+json"
      /* Данные наши, не пользовательские; JSON.stringify экранирует кавычки,
         а закрывающий тег внутри строк невозможен — в полях только контакты. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
