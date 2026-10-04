import { ChangeDetectionStrategy, Component, DestroyRef, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-product-search-toolbar',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <input [formControl]="search" placeholder="Search by name..." />
      <a class="btn primary" routerLink="/products/new">+ New</a>
    </div>
  `,
})
export class ProductSearchToolbarComponent {
  private destroyRef = inject(DestroyRef);

  readonly search = new FormControl('', { nonNullable: true });
  readonly searchChanged = output<string>();

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(query => this.searchChanged.emit(query));
  }
}
