import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ApiService } from '../services/api/api.service';
import { UtilsService } from '../services/utils/utils.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnInit {
  private token: string = '';
  protected resetForm: FormGroup;
  protected showPassword: boolean = false;
  protected showConfirmPassword: boolean = false;
  protected isSubmitting: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private utilsService: UtilsService
  ) {
    this.resetForm = this.formBuilder.group(
      {
        newPassword: [
          '',
          [
            Validators.required,
            this.passwordValidator.bind(this)
          ]
        ],

        confirmPassword: [
          '',
          [
            Validators.required
          ]
        ]
      },
      {
        validators: this.passwordsMatch
      }
    );
  }

  async ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    console.log('Reset token:', this.token);

    if (!this.token) {
      const alert = await this.utilsService.createAlert(
        'Password Reset',
        'This password reset link is invalid or expired.'
      );
      
      await alert.present(); 
      
      await alert.onDidDismiss();
      await this.router.navigate(['/login']);
    }
  }

  getPasswordError(): string {
    const password = this.resetForm.get('newPassword');
    const confirmPassword = this.resetForm.get('confirmPassword');

    if (password?.touched || password?.dirty) {
      if (password.hasError('required')) {
        return 'Password is required.';
      }

      if (password.hasError('minLength')) {
        return 'Password must be at least 10 characters long.';
      }

      if (password.hasError('uppercase')) {
        return 'Password must contain at least one uppercase letter.';
      }

      if (password.hasError('lowercase')) {
        return 'Password must contain at least one lowercase letter.';
      }

      if (password.hasError('number')) {
        return 'Password must contain at least one number.';
      }

      if (password.hasError('special')) {
        return 'Password must contain at least one special character.';
      }
    }

    if (
      confirmPassword?.value &&
      this.resetForm.hasError('mismatch')
    ) {
      return 'Passwords do not match.';
    }

    return '';
  }

  async submitReset() {
    if (this.resetForm.invalid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const newPassword = this.resetForm.get('newPassword')?.value;

    try {
      await this.apiService.confirmPasswordReset({
        token: this.token,
        newPassword: newPassword
      });

      // The password stored by "Remember login" is now invalid.
      localStorage.removeItem('onwi.Login');

      const alert = await this.utilsService.createAlert(
        'Password Reset',
        'Your password has been reset successfully.'
      );

      await alert.present();
      await alert.onDidDismiss();
    } catch (error) {
     const alert = await this.utilsService.createAlert(
        'Password Reset Failed',
        'The link is invalid or has expired'
      );
      
      await alert.present();
      await alert.onDidDismiss();
    } finally {
      this.isSubmitting = false;

      // Redirect to the login.
      await this.router.navigate(['/login']);
    }
  }

  private passwordValidator(control: AbstractControl) {
    const password = control.value || '';

    if (!password) {
      return null;
    }

    const errors: any = {};

    if (password.length < 10) {
      errors.minLength = true;
    }

    if (!/[A-Z]/.test(password)) {
      errors.uppercase = true;
    }

    if (!/[a-z]/.test(password)) {
      errors.lowercase = true;
    }

    if (!/[0-9]/.test(password)) {
      errors.number = true;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.special = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  private passwordsMatch(group: AbstractControl) {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { mismatch: true };
  }
}