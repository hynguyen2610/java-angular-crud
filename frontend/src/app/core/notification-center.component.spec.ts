import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationCenterComponent } from './notification-center.component';
import { ProductNotificationsService } from './product-notifications.service';

describe('NotificationCenterComponent', () => {
  let fixture: ComponentFixture<NotificationCenterComponent>;
  const notifications = {
    notifications: jasmine.createSpy().and.returnValue([{ id: 'event-1', message: 'admin deleted “Keyboard”.' }]),
    dismiss: jasmine.createSpy(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [{ provide: ProductNotificationsService, useValue: notifications }],
    });
    fixture = TestBed.createComponent(NotificationCenterComponent);
    fixture.detectChanges();
  });

  it('renders an accessible dismissible notification', () => {
    const notification = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;

    expect(notification.textContent).toContain('admin deleted “Keyboard”.');
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Dismiss');
  });
});
