import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Page, Product } from '../../core/models';
import { ProductTableComponent } from './product-table.component';

const emptyPage: Page<Product> = {
  content: [],
  page: 0,
  size: 5,
  totalElements: 0,
  totalPages: 0,
};

describe('ProductTableComponent UI states', () => {
  let fixture: ComponentFixture<ProductTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductTableComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ProductTableComponent);
  });

  it('announces loading products', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Loading products');
  });

  it('shows an actionable empty state instead of an empty table', () => {
    fixture.componentRef.setInput('data', emptyPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state h3')?.textContent).toContain('No products found');
    expect(fixture.nativeElement.textContent).toContain('Change the search or create a product');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('announces a recoverable request error', () => {
    fixture.componentRef.setInput('error', 'Products could not be loaded. Try again.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Products could not be loaded');
    expect(alert?.textContent).toContain('Try again');
  });
});
