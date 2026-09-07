import { siteUrl } from '@/lib/site-url';

/* Разметка Schema.org отдельными кусками: у каждой страницы своя.

   Собирается из тех же данных, что и сама страница, — цена в разметке не может
   разойтись с ценой на экране, потому что источник один. Разметка, которая
   врёт поисковику, хуже отсутствующей: за неё снимают расширенный сниппет. */

function Ld({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      /* Данные наши, из базы; JSON.stringify экранирует кавычки, а «<»
         дополнительно, чтобы строка не могла закрыть тег. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/* Хлебные крошки. Яндекс и Google рисуют по ним путь вместо голого адреса. */
export function BreadcrumbsLd({ items }: { items: { name: string; path: string }[] }) {
  if (items.length === 0) return null;

  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${siteUrl()}${item.path}`,
        })),
      }}
    />
  );
}

/* Вопросы и ответы. Единственная разметка, которая занимает в выдаче место
   сразу под сниппетом — по ней база забирает вторую строчку экрана. */
export function FaqLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;

  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }}
    />
  );
}

/* Домик — место размещения с ценой за ночь и вместимостью. */
export function HouseLd({
  house,
  imageUrl,
  amenities,
}: {
  house: { slug: string; title: string; summary: string; capacity: number; pricePerNight: number | null };
  imageUrl?: string;
  amenities: { label: string; value: string }[];
}) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'Accommodation',
        name: house.title,
        description: house.summary,
        url: `${siteUrl()}/rybachiy/doma/${house.slug}`,
        ...(imageUrl ? { image: `${siteUrl()}${imageUrl}` } : {}),
        occupancy: { '@type': 'QuantitativeValue', maxValue: house.capacity, unitText: 'гостей' },
        amenityFeature: amenities.map((item) => ({
          '@type': 'LocationFeatureSpecification',
          name: item.label,
          value: item.value,
        })),
        ...(house.pricePerNight
          ? {
              offers: {
                '@type': 'Offer',
                price: house.pricePerNight,
                priceCurrency: 'RUB',
                availability: 'https://schema.org/InStock',
                url: `${siteUrl()}/rybachiy/doma/${house.slug}`,
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: house.pricePerNight,
                  priceCurrency: 'RUB',
                  unitText: 'сутки',
                },
              },
            }
          : {}),
      }}
    />
  );
}

/* Тур — путешествие с длительностью и ценой. */
export function TourLd({
  tour,
  imageUrl,
}: {
  tour: { slug: string; title: string; summary: string; days: number; price: number | null };
  imageUrl?: string;
}) {
  return (
    <Ld
      data={{
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: tour.title,
        description: tour.summary,
        url: `${siteUrl()}/rybachiy/tury/${tour.slug}`,
        ...(imageUrl ? { image: `${siteUrl()}${imageUrl}` } : {}),
        /* ISO 8601: P2D — два дня. */
        itinerary: { '@type': 'ItemList', numberOfItems: tour.days },
        duration: `P${tour.days}D`,
        touristType: 'Активный отдых',
        provider: { '@type': 'Organization', name: 'База отдыха «Север»', url: siteUrl() },
        ...(tour.price
          ? {
              offers: {
                '@type': 'Offer',
                price: tour.price,
                priceCurrency: 'RUB',
                availability: 'https://schema.org/InStock',
                url: `${siteUrl()}/rybachiy/tury/${tour.slug}`,
              },
            }
          : {}),
      }}
    />
  );
}
