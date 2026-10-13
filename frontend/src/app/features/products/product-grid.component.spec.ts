import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Page, Product } from '../../core/models';
import { ProductGridComponent } from './product-grid.component';

const desk: Product = {
  id: 1,
  name: 'Desk',
  description: null,
  price: 120,
  quantity: 2,
  createdAt: '2026-10-04T00:00:00Z',
};

const page: Page<Product> = {
  content: [desk],
  page: 0,
  size: 5,
  totalElements: 1,
  totalPages: 1,
};

describe('ProductGridComponent', () => {
  let fixture: ComponentFixture<ProductGridComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductGridComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ProductGridComponent);
  });

  it('renders product results through AG Grid with a named-view control', () => {
    fixture.componentRef.setInput('data', page);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ag-grid-angular')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Save product grid view"]')).not.toBeNull();
  });
});
