import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  GridState,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { Page, Product } from '../../core/models';
import { ProductGridActionsComponent } from './product-grid-actions.component';
import { ProductGridView, ProductGridViewService } from './product-grid-view.service';

ModuleRegistry.registerModules([AllCommunityModule]);

const productGridTheme = themeQuartz.withParams({
  accentColor: 'var(--color-primary)',
  backgroundColor: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  fontFamily: 'var(--font-sans)',
  foregroundColor: 'var(--color-text)',
});

@Component({
  selector: 'app-product-grid',
  imports: [AgGridAngular, CurrencyPipe, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="status-message status-message--error" role="alert">
        <p>{{ error() }}</p>
        <button type="button" (click)="refreshRequested.emit()">Try again</button>
      </div>
    }
    @if (viewMessage()) {
      <div class="status-message status-message--error" role="alert">
        <p>{{ viewMessage() }}</p>
      </div>
    }
    @if (loading()) { <p class="status-message" role="status">Loading products…</p> }

    @if (data(); as result) {
      @if (result.content.length === 0) {
        <section class="empty-state" aria-labelledby="products-empty-title">
          <h3 id="products-empty-title">No products found</h3>
          <p>Change the search or <a routerLink="/products/new">create a product</a>.</p>
        </section>
      } @else {
        <section class="product-grid-shell" aria-label="Product results">
          <div class="product-grid-views">
            <label for="product-grid-view-name">Saved view</label>
            <input #viewName id="product-grid-view-name" placeholder="View name" />
            <button type="button" aria-label="Save product grid view" [disabled]="!gridApi" (click)="saveView(viewName.value)">Save view</button>
            @for (view of views(); track view.name) {
              <button type="button" (click)="restoreView(view)">Restore {{ view.name }}</button>
            }
          </div>
          <ag-grid-angular
            class="product-grid"
            [columnDefs]="columnDefs"
            [defaultColDef]="defaultColDef"
            [getRowId]="getRowId"
            [rowData]="result.content"
            [theme]="theme"
            (gridReady)="onGridReady($event)"
          />
          <div class="pager">
            <button type="button" (click)="pageRequested.emit(result.page - 1)" [disabled]="result.page === 0">Prev</button>
            <span>Page {{ result.page + 1 }} of {{ result.totalPages || 1 }} ({{ result.totalElements }} items)</span>
            <button type="button" (click)="pageRequested.emit(result.page + 1)" [disabled]="result.page + 1 >= result.totalPages">Next</button>
          </div>
        </section>
      }
    }
  `,
})
export class ProductGridComponent {
  private readonly viewStore = inject(ProductGridViewService);
  protected gridApi: GridApi<Product> | null = null;
  protected readonly viewMessage = computed(() => this.viewStore.warning());
  protected readonly views = this.viewStore.views;
  protected readonly theme = productGridTheme;

  readonly data = input<Page<Product> | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly deleteRequested = output<Product>();
  readonly pageRequested = output<number>();
  readonly refreshRequested = output<void>();

  readonly defaultColDef: ColDef<Product> = { minWidth: 120, resizable: true };
  readonly getRowId = (params: { data: Product }) => String(params.data.id);
  readonly columnDefs: ColDef<Product>[] = [
    { colId: 'name', field: 'name', headerName: 'Name', flex: 2, minWidth: 180 },
    { colId: 'price', field: 'price', headerName: 'Price', valueFormatter: params => new CurrencyPipe('en-US').transform(params.value) ?? '' },
    { colId: 'quantity', field: 'quantity', headerName: 'Qty' },
    { colId: 'createdAt', field: 'createdAt', headerName: 'Created', flex: 1.25, valueFormatter: params => new DatePipe('en-US').transform(params.value, 'short') ?? '' },
    {
      colId: 'actions',
      headerName: 'Actions',
      sortable: false,
      filter: false,
      minWidth: 180,
      pinned: 'right',
      cellRenderer: ProductGridActionsComponent,
      cellRendererParams: { requestDelete: (product: Product) => this.deleteRequested.emit(product) },
    },
  ];

  onGridReady(event: GridReadyEvent<Product>) {
    this.gridApi = event.api;
  }

  protected saveView(name: string) {
    if (!name.trim()) {
      this.viewStore.setWarning('Enter a name before saving a product view.');
      return;
    }
    if (!this.gridApi) return;
    this.viewStore.save(name, this.gridApi.getState());
  }

  protected restoreView(view: ProductGridView) {
    if (!this.gridApi) return;
    try {
      this.gridApi.setState(view.state as GridState);
      this.viewStore.setWarning(null);
    } catch {
      this.viewStore.setWarning(`Saved view “${view.name}” could not be restored. Default columns are in use.`);
    }
  }
}
