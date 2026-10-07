import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProductNotificationsService } from './product-notifications.service';

@Component({
  selector: 'app-notification-center',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="notification-center" aria-label="Product notifications">
      @for (notification of notifications.notifications(); track notification.id) {
        <div class="notification" role="status">
          <span>{{ notification.message }}</span>
          <button type="button" (click)="notifications.dismiss(notification.id)">Dismiss</button>
        </div>
      }
    </section>
  `,
})
export class NotificationCenterComponent {
  protected readonly notifications = inject(ProductNotificationsService);
}
