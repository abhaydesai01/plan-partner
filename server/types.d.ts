/**
 * Type declarations for packages that lack or have incomplete type definitions.
 */
declare module "express-rate-limit" {
  import { RequestHandler } from "express";
  interface Options {
    windowMs?: number;
    max?: number;
    message?: string | object;
    standardHeaders?: boolean;
    legacyHeaders?: boolean;
  }
  function rateLimit(options?: Options): RequestHandler;
  export default rateLimit;
}

declare module "web-push" {
  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }
  interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }
  interface SendResult {
    statusCode: number;
  }
  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: object
  ): Promise<SendResult>;
  function generateVAPIDKeys(): VapidKeys;
}

declare module "node-cron" {
  interface ScheduleOptions {
    scheduled?: boolean;
    timezone?: string;
  }
  function schedule(
    expression: string,
    fn: () => void,
    options?: ScheduleOptions
  ): { start: () => void; stop: () => void };
  const cron: { schedule: typeof schedule };
  export default cron;
}
