import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from './auth.service';
import { ProductNotificationsService } from './product-notifications.service';

describe('ProductNotificationsService', () => {
  let service: ProductNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { token: signal(null) } }],
    });
    service = TestBed.inject(ProductNotificationsService);
  });

  it('keeps one notification per event and removes it after five seconds', fakeAsync(() => {
    const event = {
      type: 'product.created',
      product: { id: 42, name: 'Keyboard' },
      actorUsername: 'admin',
      occurredAt: '2026-10-07T10:00:00Z',
    } as const;

    service.receive(event);
    service.receive(event);

    expect(service.notifications()).toEqual([jasmine.objectContaining({ message: 'admin created “Keyboard”.' })]);
    tick(5_000);
    expect(service.notifications()).toEqual([]);
  }));

  it('ignores malformed and unknown notification events', () => {
    service.receive({ type: 'product.renamed', product: { id: 42, name: 'Keyboard' } });

    expect(service.notifications()).toEqual([]);
  });
});
