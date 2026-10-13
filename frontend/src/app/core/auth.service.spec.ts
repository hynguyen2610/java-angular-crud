import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { API_URL } from './tokens';

describe('AuthService logout', () => {
  let auth: AuthService;
  let requests: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URL, useValue: '/api' },
      ],
    });
    auth = TestBed.inject(AuthService);
    requests = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => requests.verify());

  it('notifies the backend while immediately clearing the local session', () => {
    auth.acceptLogin({ token: 'test-token', username: 'admin' });

    auth.logout();

    const request = requests.expectOne('/api/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(auth.isLoggedIn()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    request.flush(null);
  });
});
