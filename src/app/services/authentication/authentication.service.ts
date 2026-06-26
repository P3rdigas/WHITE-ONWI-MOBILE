import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private SubscriptionID: any;

  constructor(
    private router: Router
  ) { }

  canActivate() {
    // this.SubscriptionID = localStorage.getItem('onwi.SubscriptionID');

    // console.log('AutenticacaoService canActivate()', this.SubscriptionID);
    // if (this.SubscriptionID) {
    //   this.router.navigate(['login']);
    //   return false;
    // }

    return true;
  }
}
