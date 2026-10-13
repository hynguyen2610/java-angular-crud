import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'product-grid-views:v1';

export interface ProductGridView {
  name: string;
  state: unknown;
}

@Injectable({ providedIn: 'root' })
export class ProductGridViewService {
  private readonly warningState = signal<string | null>(null);
  readonly warning = this.warningState.asReadonly();
  readonly views = signal<ProductGridView[]>(this.read());

  save(name: string, state: unknown) {
    const view: ProductGridView = { name: name.trim(), state };
    if (!view.name) {
      this.setWarning('Enter a name before saving a product view.');
      return;
    }
    const next = [...this.views().filter(existing => existing.name !== view.name), view];
    if (!this.persist(next)) return;
    this.views.set(next);
  }

  private read(): ProductGridView[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const parsed: unknown = JSON.parse(stored);
      if (!isViews(parsed)) throw new Error('Invalid saved views');
      return parsed;
    } catch {
      this.setWarning('Saved product views could not be restored. Default columns are in use.');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage may be unavailable or blocked; the grid remains usable with defaults.
      }
      return [];
    }
  }

  private persist(views: ProductGridView[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
      this.setWarning(null);
      return true;
    } catch {
      this.setWarning('Saved product views could not be stored on this device.');
      return false;
    }
  }

  setWarning(message: string | null) {
    this.warningState.set(message);
  }
}

function isViews(value: unknown): value is ProductGridView[] {
  return Array.isArray(value)
    && value.every(view => !!view
      && typeof view === 'object'
      && typeof (view as ProductGridView).name === 'string'
      && (view as ProductGridView).name.trim().length > 0
      && 'state' in view);
}
