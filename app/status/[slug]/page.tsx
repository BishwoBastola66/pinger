import { getPublicStatusPageData } from '@/lib/status-pages/public-data';
import { PublicStatusPageView } from '@/components/status-page/PublicStatusPageView';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface StatusPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StatusPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicStatusPageData(slug);
  if (!data) return { title: 'Status Page Not Found' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pingr.site';
  const pageUrl = `${appUrl}/status/${slug}`;
  const title = `${data.page.title} — System Status`;
  const description =
    data.page.description || `Real-time status updates and incident reports for ${data.page.title}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: data.page.title,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicStatusPage({ params }: StatusPageProps) {
  const { slug } = await params;
  const data = await getPublicStatusPageData(slug);

  if (!data) {
    notFound();
  }

  return <PublicStatusPageView data={data as any} />;
}
