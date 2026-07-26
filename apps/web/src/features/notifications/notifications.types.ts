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
  link?: string;
}

export interface NotificationsPage {
  rows: InAppNotification[];
  total: number;
  page: number;
  pageCount: number;
}
