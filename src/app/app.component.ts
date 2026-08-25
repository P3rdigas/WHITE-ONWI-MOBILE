import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';

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
import { LoadingProgressService } from './services/loading-progress/loading-progress.service';

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
    private loadingProgress: LoadingProgressService,
    private events: Events,
    private navCtrl: NavController,
    // private appVersion: AppVersion,
    private router: Router
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();

    await this.setupDeepLinks();

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

      if (status.connected) {
         if (this.networkStatus.connectionType !== 'wifi') {
          const proceed = await this.utilsService.validateMobileDataUsage(
            'Do you want to update you documents using mobile data?'
          );
          if (!proceed) {
            return;
          }
        }

        // Total steps: 6 backgroundUpdateAll steps
        this.loadingProgress.start(6);
        const progressModal = await this.utilsService.createProgressModal();
        progressModal.present();

        await this.utilsService.backgroundUpdateAll();

        this.loadingProgress.finish();
        await new Promise(resolve => setTimeout(resolve, 1000)); // brief pause to let the user see the 'Done 100%' message
        await progressModal.dismiss();
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

  private async setupDeepLinks() {
    // App already running / brought to foreground
    App.addListener('appUrlOpen', async (event) => {
      console.log('App URL opened:', event.url);
      await this.handleDeepLink(event.url);
    });

    // App was completely closed and launched by the link
    const launchUrl = await App.getLaunchUrl();

    if (launchUrl?.url) {
      console.log('App launched with URL:', launchUrl.url);
      await this.handleDeepLink(launchUrl.url);
    }
  }

  private async handleDeepLink(urlString: string) {
    try {
      const url = new URL(urlString);

      console.log('Deep link URL:', url.toString());
      console.log('Hostname:', url.hostname);
      console.log('Path:', url.pathname);
      console.log('Token:', url.searchParams.get('token'));

      if (url.hostname !== 'api.flywhite.com') {
        return;
      }

      if (url.pathname !== '/reset-password') {
        return;
      }

      const token = url.searchParams.get('token');

      if (!token) {
        console.warn('Reset password link has no token');
        return;
      }

      await this.router.navigate(['/reset-password'], {
        queryParams: { token: token }
      });

    } catch (error) {
      console.error('Error processing app URL:', error);
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
