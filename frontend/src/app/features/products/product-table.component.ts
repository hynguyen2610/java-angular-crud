import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Page, Product } from '../../core/models';

@Component({
  selector: 'app-product-table',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) { <p class="err">{{ error() }}</p> }
    @if (loading()) { <p>Loading...</p> }

    @if (data(); as res) {
      <table>
        <thead>
          <tr><th>Name</th><th>Price</th><th>Qty</th><th>Created</th><th></th></tr>
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
          } @empty {
            <tr><td colspan="5">No products found.</td></tr>
          }
        </tbody>
      </table>

      <div class="pager">
        <button (click)="pageRequested.emit(res.page - 1)" [disabled]="res.page === 0">Prev</button>
        <span>Page {{ res.page + 1 }} of {{ res.totalPages || 1 }} ({{ res.totalElements }} items)</span>
        <button (click)="pageRequested.emit(res.page + 1)" [disabled]="res.page + 1 >= res.totalPages">Next</button>
      </div>
    }
  `,
})
export class ProductTableComponent {
  readonly data = input<Page<Product> | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly deleteRequested = output<Product>();
  readonly pageRequested = output<number>();
}
