import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { MonitorTypes } from '@/components/landing/MonitorTypes';
import { Alerting } from '@/components/landing/Alerting';
import { DeveloperApi } from '@/components/landing/DeveloperApi';
import { StatusPages } from '@/components/landing/StatusPages';
import { Incidents } from '@/components/landing/Incidents';
import { Maintenance } from '@/components/landing/Maintenance';
import { Security } from '@/components/landing/Security';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import { Analytics } from '@/components/landing/Analytics';
import { Workspaces } from '@/components/landing/Workspaces';


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <MonitorTypes />
        <Alerting />
        <DeveloperApi />
        <StatusPages />
        <Incidents />
        <Analytics />
        <Maintenance />
        <Workspaces />
        <Security />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
