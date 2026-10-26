import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Product } from '../../core/models';
import { ProductImageComponent } from './product-image.component';
import { ProductService } from './product.service';

const desk: Product = {
  id: 1,
  name: 'Desk',
  description: null,
  price: 120,
  quantity: 2,
  createdAt: '2026-10-04T00:00:00Z',
  hasImage: true,
};

describe('ProductImageComponent', () => {
  let fixture: ComponentFixture<ProductImageComponent>;
  let productService: jasmine.SpyObj<ProductService>;
  let createUrl: jasmine.Spy;
  let revokeUrl: jasmine.Spy;

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['getImage']);
    productService.getImage.and.returnValue(of(new Blob(['png'], { type: 'image/png' })));
    createUrl = spyOn(URL, 'createObjectURL').and.returnValues('blob:first', 'blob:second');
    revokeUrl = spyOn(URL, 'revokeObjectURL');

    TestBed.configureTestingModule({
      imports: [ProductImageComponent],
      providers: [{ provide: ProductService, useValue: productService }],
    });
    fixture = TestBed.createComponent(ProductImageComponent);
  });

  function show(product: Product) {
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  }

  it('does not request or render anything for a product without an image', () => {
    show({ ...desk, hasImage: false });

    expect(productService.getImage).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="img"]')).toBeNull();
  });

  it('renders the fetched image from an object URL with the product name as alt text', () => {
    show(desk);

    expect(productService.getImage).toHaveBeenCalledOnceWith(1);
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:first');
    expect(img.alt).toBe('Desk');
  });

  it('revokes the previous object URL when the product changes', () => {
    show(desk);
    show({ ...desk, name: 'Desk v2' });

    expect(revokeUrl).toHaveBeenCalledOnceWith('blob:first');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:second');
  });

  it('revokes the current object URL when it is destroyed', () => {
    show(desk);

    fixture.destroy();

    expect(revokeUrl).toHaveBeenCalledOnceWith('blob:first');
  });

  it('shows an accessible placeholder when the image cannot be fetched', () => {
    productService.getImage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    show(desk);

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    const placeholder = fixture.nativeElement.querySelector('[role="img"]') as HTMLElement;
    expect(placeholder.getAttribute('aria-label')).toBe('Image unavailable for Desk');
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('clears the image when the product no longer has one', () => {
    show(desk);
    show({ ...desk, hasImage: false });

    expect(revokeUrl).toHaveBeenCalledOnceWith('blob:first');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });
});
