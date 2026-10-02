import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, EMPTY, catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { errorMessage } from '../../core/http-error';
import { Page, Product } from '../../core/models';
import { ProductService } from './product.service';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-product-list',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <input [formControl]="search" placeholder="Search by name..." />
      <a class="btn primary" routerLink="/products/new">+ New</a>
    </div>

    @if (error()) { <p class="err">{{ error() }}</p> }
    @if (loading()) { <p>Loading...</p> }

    @if (data(); as res) {
      <table>
        <thead>
          <tr><th>Name</th><th>Price</th><th>Qty</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          @for (p of res.content; track p.id) {
            <tr>
              <td>{{ p.name }}</td>
              <td>{{ p.price | currency }}</td>
              <td>{{ p.quantity }}</td>
              <td>{{ p.createdAt | date: 'short' }}</td>
              <td>
                <a [routerLink]="['/products', p.id, 'edit']">Edit</a>
                <button class="danger" (click)="remove(p)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5">No products found.</td></tr>
          }
        </tbody>
      </table>

      <div class="pager">
        <button (click)="goTo(res.page - 1)" [disabled]="res.page === 0">Prev</button>
        <span>Page {{ res.page + 1 }} of {{ res.totalPages || 1 }} ({{ res.totalElements }} items)</span>
        <button (click)="goTo(res.page + 1)" [disabled]="res.page + 1 >= res.totalPages">Next</button>
      </div>
    }
  `,
})
export class ProductListComponent {
  private service = inject(ProductService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly data = signal<Page<Product> | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** One stream of "what to load". Every change triggers a (cancellable) request. */
  private params$ = new BehaviorSubject({ q: '', page: 0 });

  constructor() {
    // Typing -> wait 300ms -> new search starting at page 0
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(q => this.params$.next({ q, page: 0 }));

    // switchMap cancels the previous request if a new one starts (no out-of-order results)
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

  remove(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.service.delete(p.id).subscribe({
      next: () => this.params$.next(this.params$.value), // reload the current page
      error: err => this.error.set(errorMessage(err)),
    });
  }
}
