'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Palette,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveStatusPageConfig } from '@/lib/status-pages/actions';
import { toast } from 'sonner';

interface BrandingManagerProps {
  initialData: {
    statusPage: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
      logoUrl: string | null;
      isPublic: boolean;
      includeInSitemap?: boolean;
      customDomain: string | null;
      customDomainStatus: 'none' | 'pending' | 'verifying' | 'verified' | 'active' | 'failed';
      customDomainVerificationToken: string | null;
      customDomainVerificationTxt: string | null;
      customDomainError: string | null;
    } | null;
    components?: any[];
    allMonitors?: any[];
    availableDomains?: string[];
  };
}

export function BrandingManager({ initialData }: BrandingManagerProps) {
  const [pageId, setPageId] = useState(initialData.statusPage?.id || '');
  const [isPending, startTransition] = useTransition();

  // Branding State
  const [title, setTitle] = useState(initialData.statusPage?.title || 'System Status');
  const [slug, setSlug] = useState(initialData.statusPage?.slug || 'my-services');
  const [description, setDescription] = useState(
    initialData.statusPage?.description || 'Real-time status updates for all operational services.'
  );
  const [logoUrl, setLogoUrl] = useState(initialData.statusPage?.logoUrl || '');
  const [isPublic, setIsPublic] = useState(initialData.statusPage?.isPublic ?? true);

  // Domain selection state
  const [selectedDomain, setSelectedDomain] = useState(
    initialData.statusPage?.customDomain || ''
  );

  // Sitemap indexing state (Yes / No)
  const [includeInSitemap, setIncludeInSitemap] = useState<boolean>(
    initialData.statusPage?.includeInSitemap ?? true
  );

  const availableDomains = Array.from(
    new Set([
      ...(initialData.availableDomains || []),
      ...(initialData.statusPage?.customDomain ? [initialData.statusPage.customDomain] : []),
    ])
  );

  // Save Settings
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await saveStatusPageConfig({
          title,
          slug,
          description,
          logoUrl: logoUrl.trim() || undefined,
          customDomain: selectedDomain ? selectedDomain : undefined,
          isPublic,
          includeInSitemap,
        });

        const activeId = res.statusPageId || pageId;
        if (activeId) {
          setPageId(activeId);
        }

        toast.success('Branding settings saved successfully!');
      } catch (err: any) {
        toast.error(err.message || 'Failed to save settings');
      }
    });
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Branding & Public Setup
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Customize your public status page appearance, slug URL, domain, and public visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedDomain ? (
            <Link
              href={`https://${selectedDomain}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
            >
              <span>Visit {selectedDomain}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              href={`/status/${slug || 'my-services'}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
            >
              <span>View Slug URL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveBranding} className="space-y-6">
        {/* Section 1: Page Branding & Identity */}
        <section className="space-y-4 pb-5 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Page Identity & Branding</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set the title, URL slug, domain routing, and public visibility for your status page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-0.5">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold text-gray-700">
                Page Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acme Inc Status"
                required
                className="text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className="text-xs font-semibold text-gray-700">
                URL Slug *
              </Label>
              <div className="flex items-center">
                <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-2 border border-r-0 border-gray-200 rounded-l-md font-mono">
                  /status/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-company"
                  required
                  className="rounded-l-none font-mono text-sm bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-gray-700">
                Description
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Real-time operational status updates and SLA metrics."
                className="text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logoUrl" className="text-xs font-semibold text-gray-700">
                Logo URL
              </Label>
              <Input
                id="logoUrl"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="text-sm bg-white"
              />
            </div>
          </div>

          {/* Select Domain & Sitemap Yes/No */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-0.5">
            {/* Domain Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="selectedDomain" className="text-xs font-semibold text-gray-700">
                  Select Domain
                </Label>
                <Link
                  href="/dashboard/domains"
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  Manage Domains →
                </Link>
              </div>
              <select
                id="selectedDomain"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default (pingr.site/status/{slug || 'my-services'})</option>
                {availableDomains.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom} {dom === initialData.statusPage?.customDomain ? '(Connected)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400">
                Choose which custom domain or default subpath serves this status page.
              </p>
            </div>

            {/* Sitemap Yes / No */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Include in Sitemap
              </Label>
              <div className="flex items-center gap-3 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition-colors flex-1 sm:flex-initial">
                  <input
                    type="radio"
                    name="includeInSitemap"
                    checked={includeInSitemap === true}
                    onChange={() => setIncludeInSitemap(true)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Yes (Index)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-lg px-3.5 py-2 hover:bg-gray-50 transition-colors flex-1 sm:flex-initial">
                  <input
                    type="radio"
                    name="includeInSitemap"
                    checked={includeInSitemap === false}
                    onChange={() => setIncludeInSitemap(false)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>No (Hide)</span>
                </label>
              </div>
              <p className="text-[11px] text-gray-400">
                Include this status page in pingr.site/sitemap.xml for search engines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <Label htmlFor="isPublic" className="text-xs font-medium text-gray-700 cursor-pointer">
              Make status page publicly viewable without authentication
            </Label>
          </div>
        </section>

        {/* Submit Bar */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs px-6"
          >
            {isPending ? 'Publishing Changes...' : 'Save & Publish Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
