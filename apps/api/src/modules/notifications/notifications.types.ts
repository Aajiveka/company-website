export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body. When present, providers send a multipart message (text + html). */
  html?: string;
}

export interface SmsMessage {
  to: string;
  text: string;
  /** The exact OTP to deliver. When set, 2Factor sends this value instead of AUTOGEN-ing its own. */
  otp?: string;
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

/* ------------------------------------------------------------------ */
/*  SSE / real-time notification types                                 */
/* ------------------------------------------------------------------ */

export enum NotificationType {
  NEW_APPLICATION = 'NEW_APPLICATION',
  APPLICATION_STATUS = 'APPLICATION_STATUS',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  JOB_ALERT = 'JOB_ALERT',
  SYSTEM = 'SYSTEM',
}

export interface InAppNotification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  /** Optional deep-link path, e.g. `/jobs/42`. */
  link?: string;
}

export interface SseClient {
  userId: number;
  roleId: number;
  res: import('express').Response;
}
