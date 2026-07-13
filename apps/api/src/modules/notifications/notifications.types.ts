export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface SmsMessage {
  to: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** Queue + job names, shared by the producer and the worker. */
export const NOTIFICATIONS_QUEUE = 'notifications';
export const EMAIL_JOB = 'email';
export const SMS_JOB = 'sms';
