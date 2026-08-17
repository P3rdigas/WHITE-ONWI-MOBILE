import { TestBed } from '@angular/core/testing';

import { LibrarySyncService } from './library-sync.service';

describe('LibrarySyncService', () => {
  let service: LibrarySyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LibrarySyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
