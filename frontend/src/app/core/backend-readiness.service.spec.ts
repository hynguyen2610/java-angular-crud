import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BackendReadinessService } from './backend-readiness.service';

describe('BackendReadinessService', () => {
  let service: BackendReadinessService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BackendReadinessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('retries an unavailable backend and becomes ready only after health is UP', fakeAsync(() => {
    expect(service.ready()).toBeFalse();
    http.expectOne('/actuator/health').error(new ProgressEvent('error'));

    tick(2_000);
    http.expectOne('/actuator/health').flush({ status: 'UP' });

    expect(service.ready()).toBeTrue();
  }));
});
