import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
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
});
