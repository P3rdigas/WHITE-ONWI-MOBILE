import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  token: string = ''
  newPassword: string = ''

  constructor(
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';
  }

  submitReset() {
    // TODO: Validate the newPassword and call the API
    console.log('Token: ', this.token, '\n');
    console.log('New password: ', this.newPassword, '\n');
  }

}
