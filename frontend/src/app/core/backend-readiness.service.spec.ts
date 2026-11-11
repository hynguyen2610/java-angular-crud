import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BackendReadinessService } from './backend-readiness.service';

describe('BackendReadinessService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('retries an unavailable backend and becomes ready only after health is UP', fakeAsync(() => {
    // Inject inside fakeAsync so the service's polling timer runs on the fake clock.
    const service = TestBed.inject(BackendReadinessService);
    expect(service.ready()).toBeFalse();

    tick(0);
    http.expectOne('/actuator/health').error(new ProgressEvent('error'));
    expect(service.ready()).toBeFalse();

    tick(2_000);
    http.expectOne('/actuator/health').flush({ status: 'UP' });

    expect(service.ready()).toBeTrue();
  }));
});
