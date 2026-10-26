import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/tokens';
import { Product } from '../../core/models';
import { ProductService } from './product.service';

const desk: Product = {
  id: 3,
  name: 'Desk',
  description: null,
  price: 120,
  quantity: 2,
  createdAt: '2026-10-04T00:00:00Z',
  hasImage: false,
};

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

  describe('images', () => {
    it('uploads an image as multipart form data with one file part', () => {
      const file = new File([new Uint8Array([0x89, 0x50])], 'desk.png', { type: 'image/png' });
      let updated: Product | undefined;
      service.uploadImage(3, file).subscribe(product => (updated = product));

      const req = http.expectOne('/api/products/3/image');
      expect(req.request.method).toBe('PUT');
      const body = req.request.body as FormData;
      expect(body instanceof FormData).toBeTrue();
      expect(body.getAll('file').length).toBe(1);
      expect((body.get('file') as File).name).toBe('desk.png');

      req.flush({ ...desk, hasImage: true });
      expect(updated?.hasImage).toBeTrue();
    });

    it('fetches the private image as a blob through the authenticated client', () => {
      let image: Blob | undefined;
      service.getImage(3).subscribe(blob => (image = blob));

      const req = http.expectOne('/api/products/3/image');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(new Blob(['png'], { type: 'image/png' }));
      expect(image?.type).toBe('image/png');
    });

    it('removes the image with DELETE', () => {
      service.removeImage(3).subscribe();
      const req = http.expectOne('/api/products/3/image');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
