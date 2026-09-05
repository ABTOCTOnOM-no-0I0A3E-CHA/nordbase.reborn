import type { SiteSettings } from '@/lib/site-data';
import { siteUrl } from '@/lib/site-url';

/* Разметка для поисковиков: Яндекс и Google показывают по ней адрес, телефон
   и координаты прямо в выдаче. Отдаём одним объектом на весь сайт из layout. */
export function JsonLd({ settings }: { settings: SiteSettings }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: 'База отдыха «Север»',
    description:
      'Своя база на полуострове Рыбачий и авторские туры по Териберке. Заброска на вездеходе, пропуск в погранзону оформляем сами.',
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
    sameAs: [settings.vk, settings.telegram].filter(Boolean),
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
