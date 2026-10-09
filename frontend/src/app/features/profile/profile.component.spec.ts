import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { ProfileComponent } from './profile.component';
import { PasskeyService } from '../../core/passkey.service';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  const profiles = {
    get: jasmine.createSpy('get'),
    update: jasmine.createSpy('update'),
  };
  const auth = { logout: jasmine.createSpy('logout') };
  const passkeys = {
    supported: () => true,
    register: jasmine.createSpy('register'),
  };

  beforeEach(() => {
    profiles.get.and.returnValue(of({ username: 'admin' }));
    profiles.update.calls.reset();
    auth.logout.calls.reset();
    passkeys.register.calls.reset();
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profiles },
        { provide: AuthService, useValue: auth },
        { provide: PasskeyService, useValue: passkeys },
      ],
    });
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the current username', () => {
    expect(component.form.controls.username.value).toBe('admin');
    expect(fixture.nativeElement.textContent).toContain('Register this Mac passkey');
  });

  it('keeps entered username and shows a duplicate error after a recoverable failure', () => {
    component.form.controls.username.setValue('taken');
    profiles.update.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'Username is already in use', errors: { username: 'Username is already in use' } },
    })));

    component.submit();
    fixture.detectChanges();

    expect(component.form.controls.username.value).toBe('taken');
    expect(component.form.controls.username.errors?.['server']).toBe('Username is already in use');
    expect(fixture.nativeElement.textContent).toContain('Username is already in use');
  });

  it('logs out after the username update succeeds', () => {
    component.form.controls.username.setValue('editor');
    profiles.update.and.returnValue(of({ username: 'editor' }));

    component.submit();

    expect(auth.logout).toHaveBeenCalled();
  });

  it('keeps the password confirmation after a recoverable registration failure', () => {
    component.passkeyPassword.setValue('wrong-password');
    passkeys.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'Incorrect password' } })));

    component.registerPasskey();
    fixture.detectChanges();

    expect(component.passkeyPassword.value).toBe('wrong-password');
    expect(fixture.nativeElement.textContent).toContain('Incorrect password');
  });

  it('shows the passkey service recovery guidance instead of a generic error', () => {
    component.passkeyPassword.setValue('admin123');
    passkeys.register.and.returnValue(throwError(() => ({
      userMessage: 'Passkey request was cancelled or not allowed. Try again and approve the Touch ID prompt.',
    })));

    component.registerPasskey();
    fixture.detectChanges();

    expect(component.passkeyPassword.value).toBe('admin123');
    expect(fixture.nativeElement.textContent).toContain('Passkey request was cancelled or not allowed');
  });

  it('reserves the generic fallback for an unclassified registration error', () => {
    component.passkeyPassword.setValue('admin123');
    passkeys.register.and.returnValue(throwError(() => new Error('unclassified')));

    component.registerPasskey();
    fixture.detectChanges();

    expect(component.passkeyPassword.value).toBe('admin123');
    expect(fixture.nativeElement.textContent).toContain('Unexpected error');
  });
});
