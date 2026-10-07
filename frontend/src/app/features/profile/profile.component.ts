import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/http-error';
import { ProfileService } from '../../core/profile.service';
import { profileValidators } from './profile-validation';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h2>Profile</h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <label>Username
          <input formControlName="username" autocomplete="username" />
          @if (form.controls.username.touched && form.controls.username.errors; as errors) {
            <small class="err">{{ errors['server'] ?? 'Username is required (max 100 characters)' }}</small>
          }
        </label>
        @if (error()) { <p class="err">{{ error() }}</p> }
        <button class="primary" [disabled]="loading() || saving()">
          {{ saving() ? 'Saving...' : 'Save profile' }}
        </button>
        <a class="btn" routerLink="/products">Cancel</a>
      </form>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profiles = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  form = this.fb.nonNullable.group({ username: ['', profileValidators.username] });

  ngOnInit() {
    this.profiles.get().subscribe({
      next: profile => {
        this.form.controls.username.setValue(profile.username);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.form.controls.username.setErrors(null);
    this.profiles.update(this.form.getRawValue().username).subscribe({
      next: () => {
        this.auth.logout();
      },
      error: err => {
        this.saving.set(false);
        this.showServerError(err);
      },
    });
  }

  private showServerError(err: unknown) {
    if (err instanceof HttpErrorResponse && err.error?.errors?.username) {
      this.form.controls.username.setErrors({ server: err.error.errors.username });
      this.form.controls.username.markAsTouched();
    }
    this.error.set(errorMessage(err));
  }
}
