import { Component, OnInit } from '@angular/core';

import { AlertController, NavController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
// import { SplashScreen } from '@ionic-native/splash-screen/ngx';
// import { StatusBar } from '@ionic-native/status-bar/ngx';
import { UtilsService } from './services/utils/utils.service';
// import { ApiService } from './services/api/api.service';
import { Events } from './services/events/events';
import { SqliteService } from './services/sqlite/sqlite.service';
// import { AppVersion } from '@ionic-native/app-version/ngx';
import { Network } from '@capacitor/network';
import { SecureStorageService } from './services/secure-storage/secure-storage.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],

  standalone: false
})
export class AppComponent implements OnInit {
  public appVersionName: any;
  public networkStatus: any = 'offline';
  private previousNetworkStatus: string = 'offline';

  constructor(
    private platform: Platform,
    // private splashScreen: SplashScreen,
    // private statusBar: StatusBar,
    private alertController: AlertController,
    private utilsService: UtilsService,
    private sqlite: SqliteService,
    private secureStorageService: SecureStorageService,
    private events: Events,
    private navCtrl: NavController,
    // private appVersion: AppVersion,
    private router: Router
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();

    await this.bootstrapOdataCredentials();

    // this.statusBar.styleLightContent();
    // this.splashScreen.hide();

    // this.appVersion.getVersionNumber().then(value => {
    //   this.appVersionName = value;
    // }).
    // catch(err => { console.log(err); });

    this.appVersionName = 'dev';

    const networkState = await Network.getStatus();
    this.updateNetworkStatus(networkState.connected, networkState.connectionType);

    // Listen for changes
    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = this.previousNetworkStatus === 'offline';
      this.updateNetworkStatus(status.connected, status.connectionType);
      this.previousNetworkStatus = this.networkStatus;
      console.log('networkStatusChange', this.networkStatus);

      // If the user has not logged in yet or continue to be online don't fire the update
      if (!this.utilsService.loginCompleted || !wasOffline) return;

      if (status.connected && status.connectionType === 'wifi') {
        this.utilsService.backgroundUpdateAll();
      } else if (status.connected && status.connectionType !== 'wifi') {
        const alert = await this.alertController.create({
          header: 'Use mobile data?',
          message: 'Do you want to update you documents using mobile data?',
          buttons: [
            { text: 'No', handler: () => { } },
            { text: 'Yes', handler: () => { this.utilsService.backgroundUpdateAll(); } }
          ]
        });
        await alert.present();
      }
    });

    try {
      await this.sqlite.initBD();
    } catch (error) {
      console.log('initBD failed', error?.message);
      navigator['app'].exitApp();
      return;
    }
  }

  changeNetworkStatus(status: string) {
    this.events.publish('changeNetworkStatus', status);
  }

  ngOnInit() {
  }

  // TODO: Check the main API TODO, should use tokens
  private async bootstrapOdataCredentials() {
    const existing = await this.secureStorageService.getOdataCredentials();

    if (existing?.username && existing?.password) {
      return;
    }

    if (environment.OdataUser && environment.OdataPassword) {
      await this.secureStorageService.setOdataCredentials(
        environment.OdataUser,
        environment.OdataPassword
      );
    }
  }

  private updateNetworkStatus(connected: boolean, connectionType: string): void {
    if (!connected) {
      this.networkStatus = 'offline';
    } else if (connectionType === 'wifi') {
      this.networkStatus = 'wifi';
    } else {
      this.networkStatus = connectionType;
    }

    localStorage.setItem('onwi.networkStatus', this.networkStatus);
    this.changeNetworkStatus(this.networkStatus);
  }
}
