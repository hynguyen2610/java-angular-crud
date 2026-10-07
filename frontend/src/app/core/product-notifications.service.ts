import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { AuthService } from './auth.service';

type ProductEventType = 'product.created' | 'product.updated' | 'product.deleted';

interface ProductLifecycleEvent {
  type: ProductEventType;
  product: { id: number; name: string };
  actorUsername: string;
  occurredAt: string;
}

export interface ProductNotification {
  id: string;
  message: string;
}

/** Owns the authenticated STOMP connection and its ephemeral product-notification state. */
@Injectable({ providedIn: 'root' })
export class ProductNotificationsService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private client: Client | null = null;
  private readonly seen = new Set<string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly notifications = signal<ProductNotification[]>([]);

  constructor() {
    effect(() => {
      const token = this.auth.token();
      if (token) {
        this.connect(token);
      } else {
        this.disconnectAndClear();
      }
    });
    this.destroyRef.onDestroy(() => this.disconnectAndClear());
  }

  receive(payload: unknown) {
    if (!isLifecycleEvent(payload)) return;

    const id = `${payload.type}:${payload.product.id}:${payload.actorUsername}:${payload.occurredAt}`;
    if (this.seen.has(id)) return;
    this.seen.add(id);

    const notification = { id, message: `${payload.actorUsername} ${verb(payload.type)} “${payload.product.name}”.` };
    this.notifications.update(current => [...current, notification]);
    this.timers.set(id, setTimeout(() => this.dismiss(id), 5_000));
  }

  dismiss(id: string) {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.notifications.update(current => current.filter(notification => notification.id !== id));
  }

  private connect(token: string) {
    if (this.client) return;
    this.client = new Client({
      brokerURL: websocketUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3_000,
      onConnect: () => this.client?.subscribe('/topic/products', message => this.receiveMessage(message)),
    });
    this.client.activate();
  }

  private receiveMessage(message: IMessage) {
    try {
      this.receive(JSON.parse(message.body));
    } catch {
      // A malformed broker message must not interrupt the connection or the product screen.
    }
  }

  private disconnectAndClear() {
    this.client?.deactivate();
    this.client = null;
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.seen.clear();
    this.notifications.set([]);
  }
}

function websocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function verb(type: ProductEventType): string {
  return type.split('.')[1];
}

function isLifecycleEvent(value: unknown): value is ProductLifecycleEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<ProductLifecycleEvent>;
  return (event.type === 'product.created' || event.type === 'product.updated' || event.type === 'product.deleted')
    && typeof event.actorUsername === 'string'
    && typeof event.occurredAt === 'string'
    && typeof event.product?.id === 'number'
    && typeof event.product?.name === 'string';
}
