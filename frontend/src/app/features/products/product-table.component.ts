import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Page, Product } from '../../core/models';

@Component({
  selector: 'app-product-table',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="status-message status-message--error" role="alert">
        <p>{{ error() }}</p>
        <button type="button" (click)="refreshRequested.emit()">Try again</button>
      </div>
    }
    @if (loading()) { <p class="status-message" role="status">Loading products…</p> }

    @if (data(); as res) {
      @if (res.content.length === 0) {
        <section class="empty-state" aria-labelledby="products-empty-title">
          <h3 id="products-empty-title">No products found</h3>
          <p>Change the search or <a routerLink="/products/new">create a product</a>.</p>
        </section>
      } @else {
        <div class="table-wrap" tabindex="0" aria-label="Product results. Scroll horizontally on smaller screens." [attr.aria-busy]="loading()">
          <table>
            <thead>
              <tr><th>Name</th><th>Price</th><th>Qty</th><th>Created</th><th><span class="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              @for (product of res.content; track product.id) {
                <tr>
                  <td>{{ product.name }}</td>
                  <td>{{ product.price | currency }}</td>
                  <td>{{ product.quantity }}</td>
                  <td>{{ product.createdAt | date: 'short' }}</td>
                  <td>
                    <a [routerLink]="['/products', product.id, 'edit']">Edit</a>
                    <button class="danger" (click)="deleteRequested.emit(product)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pager">
          <button (click)="pageRequested.emit(res.page - 1)" [disabled]="res.page === 0">Prev</button>
          <span>Page {{ res.page + 1 }} of {{ res.totalPages || 1 }} ({{ res.totalElements }} items)</span>
          <button (click)="pageRequested.emit(res.page + 1)" [disabled]="res.page + 1 >= res.totalPages">Next</button>
        </div>
      }
    }
  `,
})
export class ProductTableComponent {
  readonly data = input<Page<Product> | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly deleteRequested = output<Product>();
  readonly pageRequested = output<number>();
  readonly refreshRequested = output<void>();
}
