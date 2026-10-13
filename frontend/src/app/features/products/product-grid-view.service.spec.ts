import { TestBed } from '@angular/core/testing';
import { ProductGridViewService } from './product-grid-view.service';

describe('ProductGridViewService', () => {
  let service: ProductGridViewService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => localStorage.clear());

  it('saves and restores a named browser-local grid view', () => {
    service = TestBed.inject(ProductGridViewService);
    const state = {
      columnOrder: { orderedColIds: ['name', 'price'] },
      columnPinning: { leftColIds: ['name'], rightColIds: [] },
    };

    service.save('Inventory focus', state);

    expect(service.views()).toEqual([{ name: 'Inventory focus', state }]);
  });

  it('recovers to default views when stored data is invalid', () => {
    localStorage.setItem('product-grid-views:v1', '{not json');
    service = TestBed.inject(ProductGridViewService);

    expect(service.views()).toEqual([]);
    expect(service.warning()).toContain('could not be restored');
  });
});
