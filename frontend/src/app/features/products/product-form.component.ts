import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http-error';
import { Product } from '../../core/models';
import { ProductImageComponent } from './product-image.component';
import { imageFileError, imageUploadError } from './product-image-rules';
import { ProductService } from './product.service';
import { applyProductServerErrors, productValidators } from './product-validation';

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink, ProductImageComponent],
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
          @if (form.controls.description.touched && form.controls.description.errors; as e) {
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
          <input type="number" step="1" formControlName="quantity" />
          @if (form.controls.quantity.touched && form.controls.quantity.errors; as e) {
            <small class="err">{{ e['server'] ?? 'Quantity must be 0 or more' }}</small>
          }
        </label>

        @if (error()) { <p class="err">{{ error() }}</p> }

        <!-- Saving navigates away, which would hide the outcome of an in-flight image request. -->
        <button class="primary" [disabled]="saving() || imageBusy()">{{ saving() ? 'Saving...' : 'Save' }}</button>
        <a class="btn" routerLink="/products">Cancel</a>
      </form>

      <!-- Separate from the form: an image is uploaded on its own request, not with Save. -->
      <section class="image-field" aria-labelledby="product-image-title">
        <h3 id="product-image-title">Image</h3>
        @if (id) {
          <!-- Controls wait for the product: a GET landing after an upload would overwrite its result. -->
          @if (product(); as p) {
            <app-product-image [product]="p" />
            @if (p.hasImage) {
              <button type="button" class="danger" [disabled]="imageBusy()" (click)="removeImage()">
                {{ removing() ? 'Removing image…' : 'Remove image' }}
              </button>
            }
            <label>Choose an image (JPEG, PNG, or WebP, up to 5 MiB)
              <input type="file" accept="image/jpeg,image/png,image/webp"
                     [disabled]="imageBusy()" (change)="chooseImage($event)" />
            </label>
          }
          <!-- Always present, so assistive tech announces the text when it changes. -->
          <p class="field-hint" role="status">{{ uploading() ? 'Uploading image…' : '' }}</p>
          @if (imageError(); as e) {
            <div class="status-message status-message--error" role="alert">
              <p>{{ e }}</p>
              @if (retryFile()) { <button type="button" (click)="retryUpload()">Try again</button> }
            </div>
          }
        } @else {
          <p class="field-hint">Save the product first to add an image.</p>
        }
      </section>
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

  /** The last product returned by the server; it drives the image preview. */
  product = signal<Product | null>(null);
  uploading = signal(false);
  removing = signal(false);
  imageBusy = computed(() => this.uploading() || this.removing());
  imageError = signal<string | null>(null);
  /** Set only after a transient failure, so "Try again" resends the same file. */
  retryFile = signal<File | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', productValidators.name],
    description: ['', productValidators.description],
    price: [0, productValidators.price],
    quantity: [0, productValidators.quantity],
  });

  // Inputs/route params are ready in ngOnInit (not in the constructor)
  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.service.get(this.id).subscribe({
        next: p => {
          this.product.set(p);
          this.form.patchValue({ ...p, description: p.description ?? '' });
        },
        error: err => this.error.set(errorMessage(err)),
      });
    }
  }

  submit() {
    if (this.imageBusy()) return;
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

  chooseImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // lets the same file be chosen again after a failure
    if (!file) return;

    const invalid = imageFileError(file);
    if (invalid) {
      this.retryFile.set(null);
      this.imageError.set(invalid);
      return;
    }
    this.upload(file);
  }

  retryUpload() {
    const file = this.retryFile();
    if (file) this.upload(file);
  }

  removeImage() {
    const current = this.product();
    if (!this.id || !current?.hasImage) return;
    if (!confirm(`Remove the image from "${current.name}"?`)) return;

    const cleared = () => {
      this.removing.set(false);
      this.product.set({ ...current, hasImage: false });
    };
    this.removing.set(true);
    this.imageError.set(null);
    this.retryFile.set(null);
    this.service.removeImage(this.id).subscribe({
      next: cleared,
      error: err => {
        // 404 means the image is already gone, which is the outcome the user asked for.
        if (err instanceof HttpErrorResponse && err.status === 404) return cleared();
        this.removing.set(false);
        this.imageError.set(errorMessage(err));
      },
    });
  }

  private upload(file: File) {
    if (!this.id) return;
    this.uploading.set(true);
    this.imageError.set(null);
    this.retryFile.set(null);
    this.service.uploadImage(this.id, file).subscribe({
      next: updated => {
        this.uploading.set(false);
        this.product.set(updated); // a new object, so the preview refetches the replaced image
      },
      error: err => {
        this.uploading.set(false);
        const { message, retryable } = imageUploadError(err);
        this.imageError.set(message);
        if (retryable) this.retryFile.set(file);
      },
    });
  }

  /** Spring's ApiError.errors is { fieldName: message }: attach each to its form control. */
  private showServerErrors(err: unknown) {
    if (err instanceof HttpErrorResponse && err.status === 400 && err.error?.errors) {
      applyProductServerErrors(this.form, err.error.errors);
    }
    this.error.set(errorMessage(err));
  }
}
