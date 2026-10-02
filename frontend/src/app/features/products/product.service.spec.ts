import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/tokens';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api' }, // a fake token value, no real backend needed
      ],
    });
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a page with the search query', () => {
    let total = -1;
    service.list(1, 5, 'phone').subscribe(page => (total = page.totalElements));

    const req = http.expectOne(r => r.url === '/api/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('q')).toBe('phone');

    req.flush({ content: [], page: 1, size: 5, totalElements: 7, totalPages: 2 });
    expect(total).toBe(7);
  });

  it('sends DELETE for a product id', () => {
    service.delete(3).subscribe();
    const req = http.expectOne('/api/products/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
