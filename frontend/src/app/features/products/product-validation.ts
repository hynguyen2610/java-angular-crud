import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Shared client-side mirror of the existing ProductDto validation contract. */
export const productValidators = {
  name: [Validators.required, Validators.maxLength(100)],
  description: [Validators.maxLength(500)],
  price: [Validators.required, Validators.min(0)],
  quantity: [Validators.required, Validators.min(0), integer()],
};

/** Quantities are JSON integers in the API, so reject fractional browser values before submission. */
export function integer(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    control.value == null || Number.isInteger(control.value) ? null : { integer: true };
}

/** Maps Spring's ApiError.errors shape onto matching controls without coupling the form to HTTP. */
export function applyProductServerErrors(form: FormGroup, errors: Record<string, unknown>): void {
  for (const [field, message] of Object.entries(errors)) {
    const control = form.get(field);
    if (!control || typeof message !== 'string') continue;

    control.setErrors({ ...control.errors, server: message });
    control.markAsTouched();
  }
}
