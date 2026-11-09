import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  bigint,
  numeric,
  pgEnum,
  unique,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer']);
export const monitorTypeEnum = pgEnum('monitor_type', ['website', 'api', 'supabase', 'cron', 'heartbeat', 'tcp', 'dns', 'ssl', 'keyword', 'websocket', 'domain']);
export const monitorMethodEnum = pgEnum('monitor_method', ['GET', 'POST', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
export const monitorStatusEnum = pgEnum('monitor_status', ['pending', 'healthy', 'degraded', 'failing', 'paused', 'disabled']);
export const incidentStatusEnum = pgEnum('incident_status', ['ongoing', 'resolved']);
export const notificationChannelTypeEnum = pgEnum('notification_channel_type', ['email', 'slack', 'discord', 'webhook']);

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  provider: varchar('provider', { length: 50 }).default('email').notNull(),
  providerId: varchar('provider_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});


export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => accounts.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true }).defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.workspaceId, t.email),
}));

export const restrictions = pgTable('restrictions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  isPermanent: boolean('is_permanent').default(false).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).defaultNow().notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usage = pgTable('usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().unique().references(() => accounts.id, { onDelete: 'cascade' }),
  monthlyCalls: integer('monthly_calls').default(0).notNull(),
  totalCalls: integer('total_calls').default(0).notNull(),
  lastResetAt: timestamp('last_reset_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const otpTokens = pgTable('otp_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  purpose: varchar('purpose', { length: 50 }).default('login').notNull(),
  codeHash: varchar('code_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  unq: unique().on(t.email, t.purpose),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerPlanId: varchar('provider_plan_id', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  maxMonitors: integer('max_monitors').notNull(),
  minIntervalSeconds: integer('min_interval_seconds').notNull(),
  maxIntervalSeconds: integer('max_interval_seconds').notNull(),
  logRetentionCount: integer('log_retention_count').notNull(),
  apiAccess: boolean('api_access').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().unique().references(() => accounts.id, { onDelete: 'cascade' }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).unique(),
  planId: uuid('plan_id').references(() => plans.id),
  status: varchar('status', { length: 50 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).defaultNow().notNull(),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => plans.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD').notNull(),
  provider: varchar('provider', { length: 50 }).default('manual').notNull(),
  providerPaymentId: varchar('provider_payment_id', { length: 255 }).unique(),
  status: varchar('status', { length: 50 }).default('succeeded').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const monitors = pgTable('monitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: monitorTypeEnum('type').default('website').notNull(),
  status: monitorStatusEnum('status').default('pending').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  tags: jsonb('tags').default([]).notNull(),
  failureThreshold: integer('failure_threshold').default(1).notNull(),
  consecutiveFailures: integer('consecutive_failures').default(0).notNull(),
  lastPingAt: timestamp('last_ping_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const website = pgTable('website', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  expectedStatus: integer('expected_status').default(200),
  lastStatusCode: integer('last_status_code'),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_website_scheduler').on(t.nextPingAt),
}));

export const api = pgTable('api', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  method: monitorMethodEnum('method').default('GET').notNull(),
  headers: jsonb('headers').default({}).notNull(),
  queryParameters: jsonb('query_parameters').default({}).notNull(),
  body: text('body'),
  assertions: jsonb('assertions').default([]),
  expectedStatus: integer('expected_status').default(200),
  lastStatusCode: integer('last_status_code'),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_api_scheduler').on(t.nextPingAt),
}));

export const tcp = pgTable('tcp', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_tcp_scheduler').on(t.nextPingAt),
}));

export const dns = pgTable('dns', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  dnsQueryType: varchar('dns_query_type', { length: 20 }),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_dns_scheduler').on(t.nextPingAt),
}));

export const ssl = pgTable('ssl', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  host: text('host').notNull(),
  port: integer('port').default(443).notNull(),
  sslDaysBeforeExpiryAlert: integer('ssl_days_before_expiry_alert').default(14).notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_ssl_scheduler').on(t.nextPingAt),
}));

export const cron = pgTable('cron', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 100 }),
  gracePeriodSeconds: integer('grace_period_seconds').default(300),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
}, (t) => ({
  schedulerIdx: index('idx_cron_scheduler').on(t.nextPingAt),
}));

export const heartbeat = pgTable('heartbeat', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  heartbeatSecret: varchar('heartbeat_secret', { length: 255 }).notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  gracePeriodSeconds: integer('grace_period_seconds').default(300),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
}, (t) => ({
  schedulerIdx: index('idx_heartbeat_scheduler').on(t.nextPingAt),
  secretIdx: index('idx_heartbeat_secret').on(t.heartbeatSecret)
}));

export const keyword = pgTable('keyword', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  keyword: text('keyword').notNull(),
  shouldExist: boolean('should_exist').default(true).notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_keyword_scheduler').on(t.nextPingAt),
}));

export const websocket = pgTable('websocket', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  message: text('message'),
  expectedResponse: text('expected_response'),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_websocket_scheduler').on(t.nextPingAt),
}));

export const domain = pgTable('domain', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  daysBeforeExpiryAlert: integer('days_before_expiry_alert').default(30).notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_domain_scheduler').on(t.nextPingAt),
}));

export const supabase = pgTable('supabase', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  projectRef: varchar('project_ref', { length: 255 }),
  projectUrl: text('project_url'),
  jwtSecret: text('jwt_secret'),
  apiKey: text('api_key'),
  intervalSeconds: integer('interval_seconds').notNull(),
  timeoutSeconds: integer('timeout_seconds').default(10).notNull(),
  retryIntervalSeconds: integer('retry_interval_seconds').default(60).notNull(),
  nextPingAt: timestamp('next_ping_at', { withTimezone: true }).defaultNow().notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  lastResponseTime: integer('last_response_time'),
}, (t) => ({
  schedulerIdx: index('idx_supabase_scheduler').on(t.nextPingAt),
}));

export const pingLogs = pgTable('ping_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  success: boolean('success').notNull(),
  statusCode: integer('status_code'),
  responseTime: integer('response_time'),
  errorType: varchar('error_type', { length: 50 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const monitorStats = pgTable('monitor_stats', {
  monitorId: uuid('monitor_id').primaryKey().references(() => monitors.id, { onDelete: 'cascade' }),
  totalChecks: bigint('total_checks', { mode: 'number' }).default(0).notNull(),
  successfulChecks: bigint('successful_checks', { mode: 'number' }).default(0).notNull(),
  failedChecks: bigint('failed_checks', { mode: 'number' }).default(0).notNull(),
  fastestResponse: integer('fastest_response'),
  slowestResponse: integer('slowest_response'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  status: incidentStatusEnum('status').default('ongoing').notNull(),
  errorType: varchar('error_type', { length: 100 }),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
}, (t) => ({
  activeIncidentUniqueIndex: uniqueIndex('unique_active_incident').on(t.monitorId).where(sql`status = 'ongoing'`),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'cascade' }),
  title: text('title'),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).default('info').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  link: text('link'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).unique().notNull(),
  scopes: jsonb('scopes').default(['monitors:read']).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});

export const maintenanceWindows = pgTable('maintenance_windows', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const statusPages = pgTable('status_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  customDomain: text('custom_domain').unique(),
  customDomainStatus: text('custom_domain_status').default('none').notNull(), // 'none' | 'pending' | 'verifying' | 'verified' | 'active' | 'failed'
  customDomainVerificationToken: text('custom_domain_verification_token'),
  customDomainVerificationTxt: text('custom_domain_verification_txt'),
  customDomainVerifiedAt: timestamp('custom_domain_verified_at', { withTimezone: true }),
  customDomainError: text('custom_domain_error'),
  isPublic: boolean('is_public').default(true).notNull(),
  includeInSitemap: boolean('include_in_sitemap').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const statusPageComponents = pgTable('status_page_components', {
  id: uuid('id').defaultRandom().primaryKey(),
  statusPageId: uuid('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  monitorId: uuid('monitor_id').notNull().references(() => monitors.id, { onDelete: 'cascade' }),
  groupName: text('group_name'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const statusPageUpdates = pgTable('status_page_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  statusPageId: uuid('status_page_id').notNull().references(() => statusPages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull(), // e.g. investigating, identified, monitoring, resolved
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
