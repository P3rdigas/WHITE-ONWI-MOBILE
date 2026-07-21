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
    private events: Events,
    private navCtrl: NavController,
    // private appVersion: AppVersion,
    private router: Router
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();

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

      // if (this.networkStatus === 'offline') {
      //   if (this.router.url === '/library' || this.router.url === '/last-docs') {
      //     this.navCtrl.navigateRoot(['/my-documents', 'nao']);
      //   }
      // } else {
      //   this.utilsService.getPermissionsOffline();
      // }
    });

    try {
      await this.sqlite.initBD();
    } catch (error) {
      console.log('initBD failed', error?.message);
      navigator['app'].exitApp();
      return;
    }

    const SubscriptionID = localStorage.getItem('onwi.SubscriptionID');
    if (SubscriptionID) {
      this.router.navigate(['login']);
    }

    // // Updates when opening the app
    // if (localStorage.getItem('onwi.User') && this.networkStatus !== 'offline') {
    //   // Updates all tables in background when opening the app
    //   this.utilsService.getPermissionsOffline();
    //   setTimeout(() => {
    //     this.utilsService.backgroundUpdateMyDocuments();
    //   }, 1 * 60 * 1000); // 1 minute after
    //   setTimeout(() => {
    //     this.utilsService.backgroundUpdateFavorites();
    //   }, 3 * 60 * 1000); // 3 minutes after
    //   setTimeout(() => {
    //     this.utilsService.backgroundUpdateLastDocsDistributed();
    //   }, 5 * 60 * 1000); // 5 minutes after
    // }

    // // Updates periodically (10 MIN)
    // setInterval(() => {
    //   // Updates all tables in background periodically
    //   if (localStorage.getItem('onwi.User') && this.networkStatus !== 'offline') {
    //     this.utilsService.getPermissionsOffline();
    //     this.utilsService.backgroundUpdateLibrary();
    //     setTimeout(() => {
    //       this.utilsService.backgroundUpdateMyDocuments();
    //     }, 1 * 60 * 1000); // 1 minute after
    //     setTimeout(() => {
    //       this.utilsService.backgroundUpdateFavorites();
    //     }, 3 * 60 * 1000); // 3 minutes after
    //     setTimeout(() => {
    //       this.utilsService.backgroundUpdateLastDocsDistributed();
    //     }, 5 * 60 * 1000); // 5 minutes after
    //   }
    // }, 10 * 60 * 1000); // every 10 minutes
  }

  changeNetworkStatus(status: string) {
    this.events.publish('changeNetworkStatus', status);
  }

  ngOnInit() {
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
