import { NotificationEvent } from './types';
import { WebhookProvider } from './providers/webhook';
import { DiscordProvider } from './providers/discord';
import { SlackProvider } from './providers/slack';
import { TelegramProvider } from './providers/telegram';
import { EmailProvider } from './providers/email';

const providers = [
  WebhookProvider,
  DiscordProvider,
  SlackProvider,
  TelegramProvider,
  EmailProvider
];

export async function dispatchNotification(event: NotificationEvent, channel: any) {
  const provider = providers.find(p => p.id === channel.type);
  if (!provider) {
    console.error(`[Notifications] Unknown provider type: ${channel.type}`);
    return false;
  }
  
  return await provider.send(event, channel.config);
}
