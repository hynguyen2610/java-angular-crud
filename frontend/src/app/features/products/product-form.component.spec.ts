import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Product } from '../../core/models';
import { ProductFormComponent } from './product-form.component';
import { ProductService } from './product.service';

describe('ProductFormComponent validation', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;
  const productService = {
    create: jasmine.createSpy('create').and.returnValue(of({})),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    get: jasmine.createSpy('get').and.returnValue(of({})),
  };

  beforeEach(() => {
    productService.create.calls.reset();
    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: productService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
      ],
    });
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks invalid local fields and does not submit', () => {
    component.form.controls.name.setValue('');
    component.form.controls.quantity.setValue(1.5);

    component.submit();

    expect(productService.create).not.toHaveBeenCalled();
    expect(component.form.controls.name.touched).toBeTrue();
    expect(component.form.controls.quantity.hasError('integer')).toBeTrue();
  });

  it('does not show an untouched description validation error', () => {
    component.form.controls.description.setValue('x'.repeat(501));
    fixture.detectChanges();

    expect(component.form.controls.description.touched).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Max 500 characters');
  });

  it('shows a mapped server field error beside the affected control', () => {
    component['showServerErrors'](new HttpErrorResponse({
      status: 400,
      error: { message: 'Validation failed', errors: { name: 'Name is already used' } },
    }));
    fixture.detectChanges();

    expect(component.form.controls.name.touched).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Name is already used');
  });

  it('asks to save a new product before adding an image', () => {
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Save the product first to add an image');
  });
});

describe('ProductFormComponent image upload', () => {
  const desk: Product = {
    id: 1,
    name: 'Desk',
    description: null,
    price: 120,
    quantity: 2,
    createdAt: '2026-10-04T00:00:00Z',
    hasImage: true,
  };
  let fixture: ComponentFixture<ProductFormComponent>;
  let productService: jasmine.SpyObj<ProductService>;

  beforeEach(() => {
    productService = jasmine.createSpyObj<ProductService>('ProductService', ['get', 'uploadImage', 'getImage', 'removeImage']);
    productService.get.and.returnValue(of(desk));
    productService.getImage.and.returnValue(of(new Blob(['png'], { type: 'image/png' })));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:current');
    spyOn(URL, 'revokeObjectURL');

    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideRouter([]),
        { provide: ProductService, useValue: productService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '1']]) } } },
      ],
    });
    fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
  });

  function choose(file: File) {
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    const files = new DataTransfer();
    files.items.add(file);
    input.files = files.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  const png = () => new File([new Uint8Array(10)], 'desk.png', { type: 'image/png' });
  const text = (selector: string) => (fixture.nativeElement.querySelector(selector) as HTMLElement | null)?.textContent ?? '';

  it('shows the current image of the product being edited', () => {
    expect(fixture.nativeElement.querySelector('app-product-image img')?.getAttribute('src')).toBe('blob:current');
  });

  it('rejects an unsupported file in the browser without uploading', () => {
    choose(new File(['gif'], 'anim.gif', { type: 'image/gif' }));

    expect(productService.uploadImage).not.toHaveBeenCalled();
    expect(text('[role="alert"]')).toContain('Choose a JPEG, PNG, or WebP image.');
  });

  it('shows progress while uploading, then the replaced image', () => {
    const upload = new Subject<Product>();
    productService.uploadImage.and.returnValue(upload);

    choose(png());
    expect(productService.uploadImage).toHaveBeenCalledOnceWith(1, jasmine.any(File));
    expect(text('[role="status"]')).toContain('Uploading image');
    expect((fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBeTrue();

    upload.next({ ...desk });
    upload.complete();
    fixture.detectChanges();

    expect(text('[role="status"]')).not.toContain('Uploading image');
    expect(productService.getImage).toHaveBeenCalledTimes(2); // refetched for the replaced image
  });

  it('keeps one live region in the page so screen readers announce the upload', () => {
    const region = fixture.nativeElement.querySelector('.image-field [role="status"]');
    productService.uploadImage.and.returnValue(new Subject<Product>());

    choose(png());

    expect(fixture.nativeElement.querySelector('.image-field [role="status"]')).toBe(region);
    expect(region.textContent).toContain('Uploading image');
  });

  it('disables Save while an image request is in flight', () => {
    productService.uploadImage.and.returnValue(new Subject<Product>());

    choose(png());

    expect((fixture.nativeElement.querySelector('button.primary') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('offers retry with a reassuring message when the server is unreachable', () => {
    productService.uploadImage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    choose(png());

    expect(text('[role="alert"]')).toContain('Your current image is unchanged.');
    expect(fixture.nativeElement.querySelector('[role="alert"] button')?.textContent).toContain('Try again');
  });

  it('keeps the current image after a rejected upload and offers no retry', () => {
    productService.uploadImage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 413 })));

    choose(png());

    expect(text('[role="alert"]')).toContain('Image must be 5 MiB or smaller.');
    expect(fixture.nativeElement.querySelector('[role="alert"] button')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-product-image img')).not.toBeNull();
    expect(productService.getImage).toHaveBeenCalledTimes(1); // the product, and so the image, was not replaced
  });

  it('offers to retry the same file when storage is unavailable', () => {
    productService.uploadImage.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 503 })),
      of({ ...desk }),
    );
    const file = png();

    choose(file);
    expect(text('[role="alert"]')).toContain('Your current image is unchanged.');

    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(productService.uploadImage.calls.mostRecent().args).toEqual([1, file]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('offers image controls only after the product has loaded', () => {
    const load = new Subject<Product>();
    productService.get.and.returnValue(load);
    fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();

    // Uploading before the load finishes would let the late GET overwrite the upload's result.
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();

    load.next(desk);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[type="file"]')).not.toBeNull();
  });

  describe('removal', () => {
    const removeButton = () =>
      [...fixture.nativeElement.querySelectorAll('.image-field button')]
        .find((b: HTMLButtonElement) => b.textContent?.includes('Remove image')) as HTMLButtonElement | undefined;

    it('offers no removal when the product has no image', () => {
      productService.get.and.returnValue(of({ ...desk, hasImage: false }));
      fixture = TestBed.createComponent(ProductFormComponent);
      fixture.detectChanges();

      expect(removeButton()).toBeUndefined();
    });

    it('does nothing when the confirmation is declined', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      removeButton()!.click();

      expect(window.confirm).toHaveBeenCalledWith('Remove the image from "Desk"?');
      expect(productService.removeImage).not.toHaveBeenCalled();
    });

    it('removes the image after confirmation and clears the preview', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      productService.removeImage.and.returnValue(of(undefined));

      removeButton()!.click();
      fixture.detectChanges();

      expect(productService.removeImage).toHaveBeenCalledOnceWith(1);
      expect(fixture.nativeElement.querySelector('app-product-image img')).toBeNull();
      expect(removeButton()).toBeUndefined();
    });

    it('treats an image that is already gone as removed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      productService.removeImage.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

      removeButton()!.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-product-image img')).toBeNull();
    });

    it('keeps the image and explains a failed removal', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      productService.removeImage.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 500,
        error: { message: 'Removal failed' },
      })));

      removeButton()!.click();
      fixture.detectChanges();

      expect(text('[role="alert"]')).toContain('Removal failed');
      expect(fixture.nativeElement.querySelector('app-product-image img')).not.toBeNull();
      expect(removeButton()).toBeDefined();
    });
  });
});
