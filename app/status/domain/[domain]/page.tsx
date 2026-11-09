import { getPublicStatusPageData } from '@/lib/status-pages/public-data';
import { PublicStatusPageView } from '@/components/status-page/PublicStatusPageView';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface CustomDomainPageProps {
  params: Promise<{ domain: string }>;
}

export async function generateMetadata({ params }: CustomDomainPageProps): Promise<Metadata> {
  const { domain } = await params;
  const data = await getPublicStatusPageData(domain);
  if (!data) return { title: 'Status Page Not Found' };

  const customDomainUrl = `https://${domain}`;
  const title = `${data.page.title} — System Status`;
  const description =
    data.page.description || `Live system status and service metrics for ${data.page.title}`;

  return {
    title,
    description,
    alternates: {
      canonical: customDomainUrl,
    },
    openGraph: {
      title,
      description,
      url: customDomainUrl,
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

export default async function CustomDomainStatusPage({ params }: CustomDomainPageProps) {
  const { domain } = await params;
  const data = await getPublicStatusPageData(domain);

  if (!data) {
    notFound();
  }

  return <PublicStatusPageView data={data as any} />;
}
