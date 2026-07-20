import { Component, OnInit } from '@angular/core';
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
  private subscriptionID: any = localStorage.getItem('onwi.SubscriptionID');
  public subscription: any = JSON.parse(localStorage.getItem('onwi.Subscription'));
  private disabledForm: any = false;
  public networkStatus: any = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  private firstLogin = 'yes';
  // TODO: Maybe use protected everywhere
  protected isResetMode: boolean = false;
  protected resetMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private utilsService: UtilsService,
    private events: Events,
    private navCtrl: NavController,
    private menu: MenuController,
    private sqlite: SqliteService
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
    this.subscriptionID = localStorage.getItem('onwi.SubscriptionID');
    this.subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));

    if (this.subscriptionID) {
      if (!environment.production && this.subscriptionID === environment.testSubscriptionID) {
        this.data.email = environment.testEmail;
        this.data.password = environment.testPassword;
        this.data.remember = true;
      }
      if (localStorage.getItem('onwi.Login')) {
        this.data = JSON.parse(localStorage.getItem('onwi.Login'));
        this.firstLogin = 'no';
      }

      this.loginForm.patchValue({
        email: this.data.email,
        password: this.data.password,
        remember: this.data.remember
      });
    } else {
      // Se não tiver subscription retorna para login (/login)
      this.navCtrl.navigateRoot('/login');
    }

    if (this.subscription.Image !== null) {
      this.subscription.Image = 'data:image/png;base64,' + this.subscription.Image;
    } else {
      this.subscription.Image = 'assets/images/logo.png';
    }
  }

  async getUser() {
    if (this.loginForm.status === 'VALID' || this.loginForm.status === 'DISABLED') {
      if (this.networkStatus === 'offline') {
        if (localStorage.getItem('onwi.User')) {
          this.firstLogin = 'no';
          this.navCtrl.navigateRoot(['/my-documents', this.firstLogin]);
        } else {
          this.firstLogin = 'yes';
          const alert = await this.utilsService.createAlert('You need network connection', 'Since this is your first access you will need network connection to synchronize all the app content.');
          alert.present();
        }
      } else {
        const loading = await this.utilsService.createLoading();
        loading.present();

        this.apiService.encryptPass(this.loginForm.value.password)
        // .then(async (response) => {
        .then(async (response): Promise<any> => {
          const password: any = response;
          console.log(password);
          if (password.retorno == null) {
            const alert = await this.utilsService.createAlert('Something went wrong', 'We had a problem with your password. Please, contact the system administration.');
            alert.present();
            loading.dismiss();
            return false;
          }

          const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
          if (!subscription) {
            this.navCtrl.navigateForward('/subscription');
          }

          this.apiService.validateUser(subscription.OdataUser, subscription.OdataPassword, this.loginForm.value.email, password.retorno)
          // .then(async (response2) => {
          .then(async (response2): Promise<any> => {
            this.result = response2;
            console.log("result: ",this.result);
            if (this.result?.value?.length) {
              if (this.result.value[0].isEnabled) {
                if (localStorage.getItem('onwi.UserID')) {
                  this.firstLogin = 'no';
                  // Se já tem usuário salvo, mas é diferente do atual, apaga tudo e primeiro login
                  if (localStorage.getItem('onwi.UserID') !== this.result.value[0].ID) {
                    console.log(3);
                    localStorage.removeItem('onwi.Folders');
                    localStorage.removeItem('onwi.PermissionsOffline');
                    localStorage.removeItem('onwi.Library');
                    localStorage.removeItem('onwi.Documents');
                    localStorage.removeItem('onwi.Favorites');
                    localStorage.removeItem('onwi.LastDocs');
                    this.sqlite.clearAllRecords();
                    this.firstLogin = 'yes';
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
                this.sqlite.initBD().then(result => {
                  loading.dismiss();
                  this.navCtrl.navigateRoot(['/my-documents', this.firstLogin]);
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
    this.isResetMode = !this.isResetMode;
    this.resetMessage = '';
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
