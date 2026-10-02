import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http-error';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="card">
      <h2>{{ id ? 'Edit product' : 'New product' }}</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Name
          <input formControlName="name" />
          @if (form.controls.name.touched && form.controls.name.errors; as e) {
            <small class="err">{{ e['server'] ?? 'Name is required (max 100 characters)' }}</small>
          }
        </label>

        <label>Description
          <textarea formControlName="description" rows="3"></textarea>
          @if (form.controls.description.errors; as e) {
            <small class="err">{{ e['server'] ?? 'Max 500 characters' }}</small>
          }
        </label>

        <label>Price
          <input type="number" step="0.01" formControlName="price" />
          @if (form.controls.price.touched && form.controls.price.errors; as e) {
            <small class="err">{{ e['server'] ?? 'Price must be 0 or more' }}</small>
          }
        </label>

        <label>Quantity
          <input type="number" formControlName="quantity" />
          @if (form.controls.quantity.touched && form.controls.quantity.errors; as e) {
            <small class="err">{{ e['server'] ?? 'Quantity must be 0 or more' }}</small>
          }
        </label>

        @if (error()) { <p class="err">{{ error() }}</p> }

        <button class="primary" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Save' }}</button>
        <a class="btn" routerLink="/products">Cancel</a>
      </form>
    </div>
  `,
})
export class ProductFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  id: number | null = null;
  saving = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    price: [0, [Validators.required, Validators.min(0)]],
    quantity: [0, [Validators.required, Validators.min(0)]],
  });

  // Inputs/route params are ready in ngOnInit (not in the constructor)
  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.service.get(this.id).subscribe({
        next: p => this.form.patchValue({ ...p, description: p.description ?? '' }),
        error: err => this.error.set(errorMessage(err)),
      });
    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    const request = this.id ? this.service.update(this.id, value) : this.service.create(value);
    request.subscribe({
      next: () => this.router.navigate(['/products']),
      error: err => {
        this.saving.set(false);
        this.showServerErrors(err);
      },
    });
  }

  /** Spring's ApiError.errors is { fieldName: message }: attach each to its form control. */
  private showServerErrors(err: unknown) {
    if (err instanceof HttpErrorResponse && err.status === 400 && err.error?.errors) {
      for (const [field, msg] of Object.entries(err.error.errors)) {
        this.form.get(field)?.setErrors({ server: msg });
      }
    }
    this.error.set(errorMessage(err));
  }
}
