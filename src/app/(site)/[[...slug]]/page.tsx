import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pages } from '@/db/schema';
import { parseBlocks } from '@/lib/blocks';
import { loadBlockData } from '@/lib/site-data';
import { BlockList } from '@/components/blocks/render';

/* Один маршрут на все страницы из админки. Slug — это полный путь без ведущего
   слэша: '' для главной, 'rybachiy', 'rybachiy/tury'. Клиент заводит страницу
   с любым адресом, и она сразу открывается — отдельный маршрут писать не нужно.
   Явные маршруты (карточки домиков, туров, сезонов) специфичнее и выигрывают. */

type Params = { slug?: string[] };

async function findPage(slug: string) {
  const rows = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
    .limit(1);
  return rows[0];
}

function toSlug(params: Params): string {
  return (params.slug ?? []).join('/');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const page = await findPage(toSlug(await params));
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: `/${page.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const page = await findPage(toSlug(await params));
  if (!page) notFound();

  const blocks = parseBlocks(page.body);
  const data = await loadBlockData(blocks);

  return <BlockList blocks={blocks} data={data} />;
}
