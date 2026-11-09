import { z } from 'zod';

const assertionSchema = z.object({
  type: z.enum(['status_code', 'contains', 'not_contains', 'json_path', 'response_time']),
  property: z.string().optional(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
  value: z.string(),
});

const commonFields = {
  name: z.string().min(1, 'Name is required').max(255),
  enabled: z.boolean().default(true),
  intervalSeconds: z.coerce.number().min(60).max(86400).default(300),
  timeoutSeconds: z.coerce.number().min(1).max(300).default(10),
  failureThreshold: z.coerce.number().min(1).max(10).default(1),
  retryIntervalSeconds: z.coerce.number().min(10).max(3600).default(60),
  tags: z.array(z.string()).default([]),
};

const httpBaseFields = {
  ...commonFields,
  target: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).default('GET'),
  headers: z.record(z.string(), z.string()).default({}),
  queryParameters: z.record(z.string(), z.string()).default({}),
  body: z.string().optional().nullable(),
  assertions: z.array(assertionSchema).default([]),
  expectedStatus: z.coerce.number().min(100).max(599).default(200),
};

export const monitorFormSchema = z.discriminatedUnion('type', [
  // HTTP types
  z.object({ type: z.literal('website'), ...httpBaseFields }),
  z.object({ type: z.literal('api'), ...httpBaseFields }),
  z.object({ type: z.literal('supabase'), ...httpBaseFields }),
  z.object({ type: z.literal('keyword'), ...httpBaseFields }),
  
  // TCP
  z.object({
    type: z.literal('tcp'),
    ...commonFields,
    target: z.string().min(1, 'Host is required'),
    port: z.coerce.number().min(1).max(65535),
  }),

  // DNS
  z.object({
    type: z.literal('dns'),
    ...commonFields,
    target: z.string().min(1, 'Hostname is required'),
    dnsQueryType: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA']),
    assertions: z.array(assertionSchema).default([]),
  }),

  // SSL
  z.object({
    type: z.literal('ssl'),
    ...commonFields,
    target: z.string().min(1, 'Hostname is required'),
    port: z.coerce.number().min(1).max(65535).default(443),
    sslDaysBeforeExpiryAlert: z.coerce.number().min(1).max(365).default(14),
  }),

  // Domain
  z.object({
    type: z.literal('domain'),
    ...commonFields,
    target: z.string().min(1, 'Domain is required'),
    sslDaysBeforeExpiryAlert: z.coerce.number().min(1).max(365).default(30), 
  }),

  // WebSocket
  z.object({
    type: z.literal('websocket'),
    ...commonFields,
    target: z.string().url('Must be a valid WS/WSS URL'),
  }),

  // Cron
  z.object({
    type: z.literal('cron'),
    ...commonFields,
    target: z.string().min(1, 'Job identifier is required'),
    cronExpression: z.string().min(1, 'Cron expression is required'),
    timezone: z.string().default('UTC'),
    gracePeriodSeconds: z.coerce.number().min(0).max(86400).default(300),
  }),

  // Heartbeat
  z.object({
    type: z.literal('heartbeat'),
    ...commonFields,
    target: z.string().min(1, 'Identifier is required'),
    gracePeriodSeconds: z.coerce.number().min(0).max(86400).default(300),
    heartbeatSecret: z.string().min(8, 'Secret must be at least 8 characters'),
  }),
]);

export type MonitorFormSchemaType = z.infer<typeof monitorFormSchema>;
