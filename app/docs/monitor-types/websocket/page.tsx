import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Websocket Monitoring | Pinger API',
  description: 'Learn how to configure Websocket monitoring using the Pinger API.',
  alternates: {
    canonical: 'https://pingr.site/docs/monitor-types/websocket',
  }
};

export default function WebsocketMonitor() {
  return (
    <>
      <h1>Websocket Monitoring</h1>
      <p>
        The <code>websocket</code> monitor type allows you to track and alert on the health of your Websocket configurations.
      </p>
      
      <h2>Configuration</h2>
      <p>When creating a <code>websocket</code> monitor, ensure the <code>type</code> field is set to <code>websocket</code> in the API request.</p>
      
      <p>
        <Link href="/docs/api-reference">View API Reference &rarr;</Link>
      </p>
    </>
  );
}
