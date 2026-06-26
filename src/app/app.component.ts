import { Component, OnInit } from '@angular/core';

import { AlertController, MenuController, NavController, Platform } from '@ionic/angular';
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
  public menuFolders: any = [];
  public appVersionName: any;
  public networkStatus: any = 'offline';

  constructor(
    private platform: Platform,
    // private splashScreen: SplashScreen,
    // private statusBar: StatusBar,
    private alertController: AlertController,
    private utilsService: UtilsService,
    private sqlite: SqliteService,
    private events: Events,
    private menu: MenuController,
    private navCtrl: NavController,
    // private appVersion: AppVersion,
    private router: Router
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    this.events.subscribe('updateFolders', (folders) => {
      console.log('events.subscribe updateFolders', folders);
      this.menuFolders = folders;
    });

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
    Network.addListener('networkStatusChange', status => {
      this.updateNetworkStatus(status.connected, status.connectionType);
      console.log('networkStatusChange', this.networkStatus);

      if (this.networkStatus === 'offline') {
        if (this.router.url === '/library' || this.router.url === '/last-docs') {
          this.navCtrl.navigateRoot(['/my-documents', 'nao']);
        }
      } else {
        this.utilsService.getPermissionsOffline();
      }
    });

    try {
      await this.sqlite.initBD();
    } catch (error) {
      console.log('initBD failed', error?.message);
      navigator['app'].exitApp();
      return;
    }

    this.utilsService.getNextDownload();

    // TODO:
    const folders = await this.utilsService.prepareMenuFolders(null);
    console.log('Folders: ', folders);
    this.menuFolders = folders;

    const SubscriptionID = localStorage.getItem('onwi.SubscriptionID');
    if (SubscriptionID) {
      this.router.navigate(['login']);
    }

    // Updates when opening the app
    if (localStorage.getItem('onwi.User') && this.networkStatus !== 'offline') {
      // Updates all tables in background when opening the app
      this.utilsService.getPermissionsOffline();
      setTimeout(() => {
        this.utilsService.backgroundUpdateMyDocuments();
      }, 1 * 60 * 1000); // 1 minute after
      setTimeout(() => {
        this.utilsService.backgroundUpdateFavorites();
      }, 3 * 60 * 1000); // 3 minutes after
      setTimeout(() => {
        this.utilsService.backgroundUpdateLastDocsDistributed();
      }, 5 * 60 * 1000); // 5 minutes after
    }

    // Updates periodically (10 MIN)
    setInterval(() => {
      // Updates all tables in background periodically
      if (localStorage.getItem('onwi.User') && this.networkStatus !== 'offline') {
        this.utilsService.getPermissionsOffline();
        this.utilsService.backgroundUpdateLibrary();
        setTimeout(() => {
          this.utilsService.backgroundUpdateMyDocuments();
        }, 1 * 60 * 1000); // 1 minute after
        setTimeout(() => {
          this.utilsService.backgroundUpdateFavorites();
        }, 3 * 60 * 1000); // 3 minutes after
        setTimeout(() => {
          this.utilsService.backgroundUpdateLastDocsDistributed();
        }, 5 * 60 * 1000); // 5 minutes after
      }
    }, 10 * 60 * 1000); // every 10 minutes
  }

  changeNetworkStatus(status: string) {
    this.events.publish('changeNetworkStatus', status);
  }

  openFolder(folder: any, index: number) {
    // console.log(folder, index);
    // Tem filhos, abre ou fecha?
    if (folder.open !== null) {
      if (folder.open) {
        this.menuFolders[index].open = false;
        this.menuFolders[index].icon = 'assets/images/md-arrow-dropdown.svg';
      } else {
        this.menuFolders[index].open = true;
        this.menuFolders[index].icon = 'assets/images/md-arrow-dropup.svg';
      }
    }
  }

  filterFiles(folder: any) {
    // Abro a pasta ativa em library
    this.events.publish('selectedFolder', folder);
    this.menu.close();
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
