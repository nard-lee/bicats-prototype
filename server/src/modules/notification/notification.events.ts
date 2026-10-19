import { EventEmitter } from "node:events";

// Process-wide bus for real-time notification pushes. Each connected SSE
// client listens on `user:<id>`; the notifier emits on the same channel.
export const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(0);

export type NotificationEvent = {
  type?: string;
  title?: string;
  body?: string;
  complaintId?: number | null;
  reference?: string | null;
};

export function emitNotification(userId: number, payload: NotificationEvent = {}): void {
  notificationEvents.emit(`user:${userId}`, payload);
}
