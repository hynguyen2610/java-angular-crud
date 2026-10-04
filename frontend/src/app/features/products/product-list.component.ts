import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, catchError, switchMap, tap } from 'rxjs';
import { errorMessage } from '../../core/http-error';
import { Page, Product } from '../../core/models';
import { ProductSearchToolbarComponent } from './product-search-toolbar.component';
import { ProductService } from './product.service';
import { ProductTableComponent } from './product-table.component';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-product-list',
  imports: [ProductSearchToolbarComponent, ProductTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-product-search-toolbar (searchChanged)="searchProducts($event)" />
    <app-product-table
      [data]="data()"
      [loading]="loading()"
      [error]="error()"
      (deleteRequested)="remove($event)"
      (pageRequested)="goTo($event)"
    />
  `,
})
export class ProductListComponent {
  private service = inject(ProductService);

  readonly data = signal<Page<Product> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** One stream of "what to load". Every change triggers a (cancellable) request. */
  private params$ = new BehaviorSubject({ q: '', page: 0 });

  constructor() {
    // The sibling toolbar emits a query; the parent owns the HTTP-backed state.
    this.params$
      .pipe(
        tap(() => { this.loading.set(true); this.error.set(null); }),
        switchMap(p =>
          this.service.list(p.page, PAGE_SIZE, p.q).pipe(
            catchError(err => {
              this.error.set(errorMessage(err));
              this.loading.set(false);
              return EMPTY; // keep the outer stream alive
            }),
          ),
        ),
        takeUntilDestroyed(), // unsubscribes when the component is destroyed
      )
      .subscribe(page => {
        this.data.set(page);
        this.loading.set(false);
      });
  }

  goTo(page: number) {
    this.params$.next({ ...this.params$.value, page });
  }

  searchProducts(query: string) {
    this.params$.next({ q: query, page: 0 });
  }

  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.service.delete(p.id).subscribe({
      next: () => this.params$.next(this.params$.value), // reload the current page
      error: err => this.error.set(errorMessage(err)),
    });
  }
}
