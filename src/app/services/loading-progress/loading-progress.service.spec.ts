import { TestBed } from '@angular/core/testing';

import { LoadingProgressService } from './loading-progress.service';

describe('LoadingProgressService', () => {
  let service: LoadingProgressService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingProgressService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
