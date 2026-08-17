import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LibrarySyncService {
  private _isUpdating = new BehaviorSubject<boolean>(false);
  isUpdating$ = this._isUpdating.asObservable();

  setUpdating(value: boolean) {
    this._isUpdating.next(value);
  }
}