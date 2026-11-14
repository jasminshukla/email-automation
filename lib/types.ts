export type Contact = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  unsubscribed: boolean;
  createdAt?: string;
};

export type Audience = {
  id: string;
  name: string;
  createdAt?: string;
};

export type Template = {
  id: string;
  name: string;
  alias?: string | null;
  status: string;
  subject?: string | null;
  from?: string | null;
  html?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  variables?: Array<{
    key: string;
    type?: string;
    fallbackValue?: string | null;
  }>;
};

export type Campaign = {
  id: string;
  name?: string | null;
  audienceId?: string | null;
  segmentId?: string | null;
  status: string;
  createdAt?: string | null;
  scheduledAt?: string | null;
  sentAt?: string | null;
};
