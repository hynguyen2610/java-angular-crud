import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { Product } from '../../core/models';

interface ProductGridActionParams extends ICellRendererParams<Product> {
  requestDelete: (product: Product) => void;
}

@Component({
  selector: 'app-product-grid-actions',
  imports: [RouterLink],
  template: `
    @if (product) {
      <div class="grid-actions">
        <a [routerLink]="['/products', product.id, 'edit']">Edit</a>
        <button class="danger" type="button" (click)="remove()">Delete</button>
      </div>
    }
  `,
})
export class ProductGridActionsComponent implements ICellRendererAngularComp {
  protected product: Product | null = null;
  private requestDelete: ((product: Product) => void) | null = null;

  agInit(params: ProductGridActionParams): void {
    this.product = params.data ?? null;
    this.requestDelete = params.requestDelete;
  }

  refresh(params: ProductGridActionParams): boolean {
    this.agInit(params);
    return true;
  }

  protected remove() {
    if (this.product) this.requestDelete?.(this.product);
  }
}
