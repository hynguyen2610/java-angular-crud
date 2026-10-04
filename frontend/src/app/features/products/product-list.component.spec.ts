import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Page, Product } from '../../core/models';
import { ProductListComponent } from './product-list.component';
import { ProductService } from './product.service';

const desk: Product = {
  id: 1,
  name: 'Desk',
  description: null,
  price: 120,
  quantity: 2,
  createdAt: '2026-10-04T00:00:00Z',
};

const emptyPage: Page<Product> = {
  content: [],
  page: 0,
  size: 5,
  totalElements: 0,
  totalPages: 0,
};

describe('ProductListComponent sibling communication', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  const productService = {
    list: jasmine.createSpy('list').and.returnValue(of(emptyPage)),
    delete: jasmine.createSpy('delete').and.returnValue(of(void 0)),
  };

  beforeEach(() => {
    productService.list.calls.reset();
    productService.delete.calls.reset();
    productService.list.and.returnValue(of(emptyPage));
    productService.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [{ provide: ProductService, useValue: productService }],
    });
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();
  });

  it('loads and displays search results emitted by the toolbar sibling', fakeAsync(() => {
    productService.list.and.callFake((_page: number, _size: number, q: string) =>
      of(q === 'desk' ? { ...emptyPage, content: [desk], totalElements: 1, totalPages: 1 } : emptyPage),
    );

    const search = fixture.nativeElement.querySelector('app-product-search-toolbar input') as HTMLInputElement;
    search.value = 'desk';
    search.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    expect(productService.list).toHaveBeenCalledWith(0, 5, 'desk');
    expect(fixture.nativeElement.textContent).toContain('Desk');
  }));

  it('handles a confirmed table delete request by deleting and reloading', () => {
    productService.list.and.returnValue(of({ ...emptyPage, content: [desk], totalElements: 1, totalPages: 1 }));
    spyOn(window, 'confirm').and.returnValue(true);
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-product-table .danger') as HTMLButtonElement).click();

    expect(productService.delete).toHaveBeenCalledWith(desk.id);
    expect(productService.list).toHaveBeenCalledTimes(2);
  });

  it('shows a recoverable error when a table delete request fails', () => {
    productService.list.and.returnValue(of({ ...emptyPage, content: [desk], totalElements: 1, totalPages: 1 }));
    productService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { message: 'Delete failed' },
    })));
    spyOn(window, 'confirm').and.returnValue(true);
    fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-product-table .danger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Delete failed');
  });
});
