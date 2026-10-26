import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, switchMap } from 'rxjs';
import { Product } from '../../core/models';
import { ProductService } from './product.service';

/**
 * Shows a product's private image. The endpoint needs the bearer token, so the bytes are fetched
 * through HttpClient and rendered from an in-memory object URL that is revoked when it is replaced.
 */
@Component({
  selector: 'app-product-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src(); as url) {
      <img class="product-image" [src]="url" [alt]="product().name" />
    } @else if (failed()) {
      <span class="product-image product-image--placeholder" role="img"
            [attr.aria-label]="'Image unavailable for ' + product().name"></span>
    }
  `,
})
export class ProductImageComponent {
  readonly product = input.required<Product>();

  private service = inject(ProductService);
  readonly src = signal<string | null>(null);
  readonly failed = signal(false);

  constructor() {
    // switchMap cancels an in-flight fetch when the product changes, so a stale image never lands.
    toObservable(this.product)
      .pipe(
        switchMap(product => {
          this.release();
          this.failed.set(false);
          if (!product.hasImage) return EMPTY;
          return this.service.getImage(product.id).pipe(
            catchError(() => {
              this.failed.set(true);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(blob => this.src.set(URL.createObjectURL(blob)));

    inject(DestroyRef).onDestroy(() => this.release());
  }

  private release() {
    const url = this.src();
    if (url) {
      URL.revokeObjectURL(url);
      this.src.set(null);
    }
  }
}
