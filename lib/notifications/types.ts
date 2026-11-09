export interface NotificationEvent {
  monitorId: string;
  monitorName: string;
  eventType: 'down' | 'degraded' | 'recovered' | 'ssl_expiring' | 'domain_expiring' | 'cron_missed' | 'heartbeat_missed';
  errorMessage?: string;
  responseTime?: number | null;
  statusCode?: number | null;
  timestamp: Date;
}

export interface NotificationProvider {
  id: string;
  send(event: NotificationEvent, config: any): Promise<boolean>;
}
