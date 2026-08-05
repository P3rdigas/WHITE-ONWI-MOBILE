import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { ApiService } from '../services/api/api.service';
import { UtilsService } from '../services/utils/utils.service';
import { NavController, MenuController } from '@ionic/angular';
import { Events } from '../services/events/events';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  private data: any = { email: '', password: '', remember: false };
  private result: any;
  private disabledForm: any = false;
  public networkStatus: any = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  private isLoggedIn: boolean = false;
  // TODO: Maybe use protected everywhere
  protected showPassword: boolean = false;
  protected isResetMode: boolean = false;
  protected resetMessage: string = '';

  // For UI animations
  @ViewChild('titleContainer') titleContainer!: ElementRef<HTMLElement>;
  @ViewChild('loginCard') loginCard!: ElementRef<HTMLElement>;

  private readonly wipeDuration: number = 350; // Duration in milliseconds

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private utilsService: UtilsService,
    private events: Events,
    private navCtrl: NavController,
    private menu: MenuController,
    private sqlite: SqliteService,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.menu.enable(false);

    this.loginForm = this.formBuilder.group({
      email: new FormControl(
        {
          value: this.data.email,
          disabled: this.disabledForm
        },
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$')
        ])
      ),
      password: new FormControl({
        value: this.data.password,
        disabled: this.disabledForm
      }, Validators.required),
      remember: new FormControl(this.data.remember)
    });

    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
  }

  ionViewWillEnter() {
    if (!environment.production) {
      this.data.email = environment.testEmail;
      this.data.password = environment.testPassword;
      this.data.remember = true;
    }

    if (localStorage.getItem('onwi.Login')) {
      this.data = JSON.parse(localStorage.getItem('onwi.Login'));
    }

    this.loginForm.patchValue({
      email: this.data.email,
      password: this.data.password,
      remember: this.data.remember
    });

    const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
    console.log('subscription data: ', JSON.stringify(subscription, null, 2));
  }

  async getUser() {
    if (this.loginForm.status === 'VALID' || this.loginForm.status === 'DISABLED') {
      if (this.networkStatus === 'offline') {
        if (localStorage.getItem('onwi.User')) {
          this.utilsService.loginCompleted = true;
          this.navCtrl.navigateRoot(['/my-documents']);
        } else {
          const alert = await this.utilsService.createAlert('You need network connection', 'Since this is your first access you will need network connection to synchronize all the app content.');
          alert.present();
        }
      } else {
        const loading = await this.utilsService.createLoading();
        loading.present();

        this.apiService.encryptPass(this.loginForm.value.password)
        .then(async (response): Promise<any> => {
          const password: any = response;
          console.log(password);
          if (password.retorno == null) {
            const alert = await this.utilsService.createAlert('Something went wrong', 'We had a problem with your password. Please, contact the system administration.');
            alert.present();
            loading.dismiss();
            return false;
          }

          this.apiService.validateUser(this.loginForm.value.email, password.retorno)
          // .then(async (response2) => {
          .then(async (response2): Promise<any> => {
            this.result = response2;
            if (this.result?.value?.length) {
              if (this.result.value[0].isEnabled) {
                if (localStorage.getItem('onwi.UserID')) {
                  // Se já tem usuário salvo, mas é diferente do atual, apaga tudo e primeiro login
                  if (localStorage.getItem('onwi.UserID') !== this.result.value[0].ID) {
                    localStorage.removeItem('onwi.Folders');
                    localStorage.removeItem('onwi.PermissionsOffline');
                    localStorage.removeItem('onwi.Library');
                    localStorage.removeItem('onwi.Documents');
                    localStorage.removeItem('onwi.Favorites');
                    localStorage.removeItem('onwi.LastDocs');
                    this.sqlite.clearAllRecords();
                  }
                }
                // Salva no localStorage
                localStorage.setItem('onwi.UserID', this.result.value[0].ID);
                localStorage.setItem('onwi.User', JSON.stringify(this.result.value[0]));

                if (this.loginForm.value.remember) {
                  localStorage.setItem('onwi.Login', JSON.stringify(this.loginForm.value));
                } else {
                  localStorage.removeItem('onwi.Login');
                }
                this.sqlite.initBD().then(async result => {
                  if (this.networkStatus !== 'offline') {
                    await this.utilsService.backgroundUpdateAll();
                  }

                  loading.dismiss();

                  this.utilsService.loginCompleted = true;
                  this.navCtrl.navigateRoot(['/my-documents']);
                });
              } else {
                loading.dismiss();
                const alert = await this.utilsService.createAlert('Something went wrong', 'onwi Mobile is deactivated please contact your company\'s IT Department');
                alert.present();
              }
            } else {
              loading.dismiss();
              const toast = await this.utilsService.createToast('Please, enter a valid email and password.');
              await toast.present();
            }

            return true;
          })
          .catch(async (error2) => {
            // TODO: Print an error message if the certificate is invalid or expired, or if the server is unreachable
            console.log('validateUser failed - status:', error2.status);
            console.log('validateUser failed - message:', error2.message);
            console.log('validateUser failed - error:', JSON.stringify(error2.error));
            loading.dismiss();
            if (localStorage.getItem('onwi.User')) {
              this.navCtrl.navigateForward('/library');
            } else {
              const alert = await this.utilsService.createAlert('Something went wrong', 'Please, try again latter.');
              alert.present();
            }
          });

          return true;
        })
        .catch(async (error) => {
          loading.dismiss();
          const alert = await this.utilsService.createAlert('Something went wrong', 'onwi Mobile - Error on password.');
          alert.present();
        });
      }
    } else {
      const toast = await this.utilsService.createToast('Please, enter a valid email and password.');
      toast.present();
    }
  }

  toggleResetMode() {
    this.resetMessage = '';

    const loginCardEl = this.loginCard.nativeElement;
    const titleEl = this.titleContainer.nativeElement;

    // Lock the current height
    const oldHeight = loginCardEl.getBoundingClientRect().height;
    loginCardEl.style.height = `${oldHeight}px`;
    loginCardEl.style.overflow = 'hidden';

    // Phase 1: erase current content from bottom to top and title fades/pops OUT
    const eraseAnimation = loginCardEl.animate(
      [
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 100% 0%)' }
      ],
      { duration: this.wipeDuration, easing: 'ease-in', fill: 'forwards' }
    );

    const titleLeaveAnim = titleEl.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: 'scale(0.9)' }
      ],
      { duration: this.wipeDuration * 0.6, easing: 'ease-in', fill: 'forwards' }
    );

    // Content swaps after erase
    eraseAnimation.onfinish = () => {
      eraseAnimation.commitStyles();
      eraseAnimation.cancel();
      titleLeaveAnim.commitStyles();
      titleLeaveAnim.cancel();

      // Re-enter Angular's zone so the state change actually triggers change detection and the *ngIf content updates
      this.ngZone.run(() => {
        this.isResetMode = !this.isResetMode;
      });

      requestAnimationFrame(() => {
        // Measure the height of the NEW content
        loginCardEl.style.height = 'auto';
        const newHeight = loginCardEl.scrollHeight;
        loginCardEl.style.height = `${oldHeight}px`; // lock back before animating

        // Phase 2a: reveal new content, top edge drops down
        const revealAnim = loginCardEl.animate(
          [
            { clipPath: 'inset(0% 0% 100% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)' }
          ],
          { duration: this.wipeDuration, easing: 'ease-out', fill: 'forwards' }
        );

        // Phase 2b: height animates independently, own duration/easing
        const heightAnim = loginCardEl.animate(
          [
            { height: `${oldHeight}px` },
            { height: `${newHeight}px` }
          ],
          { duration: this.wipeDuration + 30, easing: 'ease-in-out', fill: 'forwards' }
        );

        // Phase 2c: title fades/pops IN, synced with the card reveal
        const titleEnterAnim = titleEl.animate(
          [
            { opacity: 0, transform: 'scale(0.9)' },
            { opacity: 1, transform: 'scale(1)' }
          ],
          { duration: this.wipeDuration, easing: 'ease-out', fill: 'forwards' }
        );

        revealAnim.onfinish = () => {
          revealAnim.commitStyles();
          revealAnim.cancel();
        };

        heightAnim.onfinish = () => {
          heightAnim.commitStyles();
          heightAnim.cancel();
          loginCardEl.style.height = '';
          loginCardEl.style.overflow = '';
        };

        titleEnterAnim.onfinish = () => {
          titleEnterAnim.commitStyles();
          titleEnterAnim.cancel();
        };
      });
    }
  }

  async requestReset() {
    const email = this.loginForm.value.email;

    if (!email || this.loginForm.get('email').invalid) {
      const toast = await this.utilsService.createToast('Please, enter a valid email.');
      toast.present();
      return;
    }

    const obj = {
      Email: email
    }

    const loading = await this.utilsService.createLoading();
    loading.present();

    this.apiService.requestPasswordReset(obj)
      .then(async (response: any) => {
        loading.dismiss();
        this.resetMessage = 'If this email exists a reset link has been sent.'
      })
      .catch(async (error) => {
        loading.dismiss();
        const alert = await this.utilsService.createAlert('Something went wrong', 'Please, try again later.');
        alert.present();
      });
  }

  exit() {
    this.utilsService.exitApp('externo', true);
  }
}
