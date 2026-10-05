import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { BackendReadinessService } from '../../core/backend-readiness.service';
import { AuthService } from '../../core/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent backend readiness', () => {
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { login: () => of(void 0) } },
        { provide: BackendReadinessService, useValue: { ready: signal(false) } },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('shows backend startup status and disables sign-in until the backend is ready', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(fixture.nativeElement.textContent).toContain('Starting server');
    expect(button.disabled).toBeTrue();
  });
});
