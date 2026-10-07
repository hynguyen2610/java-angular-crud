import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ProfileService } from '../../core/profile.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  const profiles = {
    get: jasmine.createSpy('get'),
    update: jasmine.createSpy('update'),
  };
  const auth = { logout: jasmine.createSpy('logout') };

  beforeEach(() => {
    profiles.get.and.returnValue(of({ username: 'admin' }));
    profiles.update.calls.reset();
    auth.logout.calls.reset();
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profiles },
        { provide: AuthService, useValue: auth },
      ],
    });
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the current username', () => {
    expect(component.form.controls.username.value).toBe('admin');
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
});
