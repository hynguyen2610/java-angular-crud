import { FormControl, FormGroup } from '@angular/forms';
import { applyProductServerErrors, productValidators } from './product-validation';

describe('product validation helpers', () => {
  it('enforces the existing product field rules', () => {
    const name = new FormControl('', { nonNullable: true, validators: productValidators.name });
    const description = new FormControl('x'.repeat(501), { nonNullable: true, validators: productValidators.description });
    const price = new FormControl(-1, { nonNullable: true, validators: productValidators.price });
    const quantity = new FormControl(1.5, { nonNullable: true, validators: productValidators.quantity });

    expect(name.hasError('required')).toBeTrue();
    expect(description.hasError('maxlength')).toBeTrue();
    expect(price.hasError('min')).toBeTrue();
    expect(quantity.hasError('integer')).toBeTrue();
  });

  it('maps a server field error to the affected touched control', () => {
    const form = new FormGroup({
      name: new FormControl('', { nonNullable: true, validators: productValidators.name }),
      description: new FormControl('', { nonNullable: true, validators: productValidators.description }),
    });

    applyProductServerErrors(form, { name: 'Name is already used', unknown: 'Ignored' });

    expect(form.controls.name.errors).toEqual(jasmine.objectContaining({ server: 'Name is already used' }));
    expect(form.controls.name.touched).toBeTrue();
    expect(form.controls.description.errors).toBeNull();
  });
});
