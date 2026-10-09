import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { errorInterceptor, SKIP_AUTH_LOGOUT } from './error.interceptor';

describe('errorInterceptor', () => {
  const auth = { logout: jasmine.createSpy('logout') };
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    auth.logout.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('keeps the session for a password-confirmation 401 handled by the form', () => {
    http.post('/api/auth/passkey/registration/options', { password: 'wrong' }, {
      context: new HttpContext().set(SKIP_AUTH_LOGOUT, true),
    }).subscribe({ error: () => undefined });

    requests.expectOne('/api/auth/passkey/registration/options').flush(
      { message: 'Passkey verification failed' }, { status: 401, statusText: 'Unauthorized' },
    );

    expect(auth.logout).not.toHaveBeenCalled();
  });
});
