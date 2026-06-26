import { Component, OnInit } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { NavController, MenuController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { UtilsService } from '../services/utils/utils.service';
// import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.page.html',
  styleUrls: ['./subscription.page.scss'],
  standalone: false
})
export class SubscriptionPage implements OnInit {
  subscriptionForm: FormGroup;
  private data: any = { subscriptionID: environment.testSubscriptionID };
  private result: any;

  constructor(
    private formBuilder: FormBuilder,
    private apiService: ApiService,
    private utilsService: UtilsService,
    private navCtrl: NavController,
    // private iab: InAppBrowser,
    private menu: MenuController
  ) { }

  ngOnInit() {
    this.menu.enable(false);

    this.subscriptionForm = this.formBuilder.group({
      subscriptionID: new FormControl(
        this.data.subscriptionID,
        Validators.compose([
          Validators.required,
          Validators.pattern('^[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+$')
        ])
      )
    });
  }

  async getSubscription() {
    if (this.subscriptionForm.status === 'VALID') {
      // Validate network connection
      if (localStorage.getItem('onwi.networkStatus') === 'offline') {
        if (localStorage.getItem('onwi.Subscription')) {
          this.navCtrl.navigateForward('/login');
        } else {
          const alert = await this.utilsService.createAlert('You need network connection', 'Since this is your first access you will need network connection to synchronize all the app content.');
          alert.present();
        }
      } else {
        const loading = await this.utilsService.createLoading();
        loading.present();

        // this.apiService.validateSubscription(this.subscriptionForm.controls.subscriptionID.value)
        this.apiService.validateSubscription(this.subscriptionForm.controls['subscriptionID'].value)
        .then(async (response) => {
          this.result = response;
          loading.dismiss();
          if (this.result.value.length) {
            if (this.result.value[0].isActivate) {
              // Verifico se SubscriptionID === salvo em localStorage
              // Se for diferente eu limpo o localStorage
              if (localStorage.getItem('onwi.Subscription')) {
                if (this.data.subscriptionID !== this.result.value[0].SubscriptionID) {
                  localStorage.removeItem('onwi.Login');
                  localStorage.removeItem('onwi.UserID');
                  localStorage.removeItem('onwi.User');
                  localStorage.removeItem('onwi.Folders');
                  localStorage.removeItem('onwi.PermissionsOffline');
                  localStorage.removeItem('onwi.Library');
                  localStorage.removeItem('onwi.Documents');
                  localStorage.removeItem('onwi.Favorites');
                  localStorage.removeItem('onwi.LastDocs');
                }
              }
              // Salva no localStorage
              localStorage.setItem('onwi.SubscriptionID', this.result.value[0].SubscriptionID);
              localStorage.setItem('onwi.SoftwareID', this.result.value[0].SoftwareID);
              localStorage.setItem('onwi.Subscription', JSON.stringify(this.result.value[0]));
              this.navCtrl.navigateForward('/login');
            } else {
              const alert = await this.utilsService.createAlert('Something went wrong', 'onwi Mobile is deactivated please contact your company\'s IT Department');
              alert.present();
            }
          } else {
            document.querySelector('#subscriptionID').classList.add('campo-invalido');
            const toast = await this.utilsService.createToast('Please, enter a valid SubscriptionID.');
            await toast.present();
          }
        })
        .catch(async (error) => {
          // console.log('this.apiService.validateSubscription - error', error);
          loading.dismiss();
          if (localStorage.getItem('onwi.Subscription')) {
            this.navCtrl.navigateForward('/login');
          } else {
            const alert = await this.utilsService.createAlert('Something went wrong', 'Service temporarily unavailable. Please contact <a href="mailto:info@onwi-app.com">info@onwi-app.com</a> and submit SubscriptionID.');
            alert.present();
          }
        });
      }
    } else {
      Object.keys(this.subscriptionForm.controls).forEach(control => {
        const response: any = control;
        if (response !== null) {
          if (response.status == null || response.status === 'INVALID') {
            try {
              document.querySelector('#' + response).classList.add('campo-invalido');
            } catch (error) { }
          } else {
            try {
              if (document.querySelector('#' + control).classList.contains('campo-invalido')) {
                document.querySelector('#' + control).classList.remove('campo-invalido');
              }
            } catch (error) { }
          }
        }
      });

      const toast = await this.utilsService.createToast('Please, enter a valid SubscriptionID.');
      toast.present();
    }
  }

  openWebsite() {
    try {
      // 'location=yes, closebuttoncolor=#FFFFFF, toolbar=yes, toolbarcolor=#0097A8'
      // const browser = this.iab.create('https://www.onwi-app.com', '_system');
      window.open('https://www.onwi-app.com', '_blank');
    } catch (error) {
      console.error(error);
    }
  }

  ionViewWillEnter() {
    if (localStorage.getItem('onwi.SubscriptionID')) {
      this.data.subscriptionID = localStorage.getItem('onwi.SubscriptionID');
    } else {
      this.data.subscriptionID = environment.testSubscriptionID;
    }
    this.subscriptionForm.patchValue({
      subscriptionID: this.data.subscriptionID
    });
  }
}
