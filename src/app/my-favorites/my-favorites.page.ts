import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { UtilsService } from '../services/utils/utils.service';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { BaseDocumentPage } from '../base-document.page';

@Component({
  selector: 'app-my-favorites',
  templateUrl: './my-favorites.page.html',
  styleUrls: ['./my-favorites.page.scss'],
  standalone: false
})
export class MyFavoritesPage extends BaseDocumentPage implements OnInit {
  public user: any = localStorage.getItem('onwi.User');
  public subscription: any = localStorage.getItem('onwi.Subscription');
  public tabsFolders = 'My Favorites';
  public documents: any = null;
  public fullDocuments: any = null;
  public networkStatus: any = 'offline';
  public search = '';

  constructor(
    private alertController: AlertController,
    private utilsService: UtilsService,
    private apiService: ApiService,
    private sqlite: SqliteService,
    private events: Events,
  ) {
    super();
  }

  ngOnInit() {
    const session = this.utilsService.initUserSession();
    if (!session) return;
    this.user = session.user;
    this.subscription = session.subscription;

    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateMyFavorites', (folders) => {
      console.log('events.subscribe updateMyFavorites', folders);
      this.getFavorites();
    });
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  refresh(updateApi?) {
    this.tabsFolders = 'My Favorites';
    this.search = '';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    if (updateApi) {
      this.utilsService.getPermissionsOffline();
      this.getFavoritesAPI();
    } else {
      this.getFavorites();
    }
  }

  inputFilterSearch() {
    this.documents = this.utilsService.filterDocumentSearch(this.documents, this.search);
  }

  async getFavoritesAPI() {
    await this.utilsService.fetchAndStoreDocuments({
      networkStatus: this.networkStatus,
      apiCall: () => this.apiService.getFavoritesDocuments(this.subscription.OdataUser, this.subscription.OdataPassword, this.user.ID),
      listType: 'myFavorites',
      storeCall: (docs) => this.sqlite.updateMyFavoritesList(docs),
      refreshCall: () => this.getFavorites()
    });
  }

  async getFavorites() {
    // const loading = await this.utilsService.createLoading();
    // loading.present();

    this.sqlite.getMyFavorites().then((documents: any) => {
      console.log('getMyFavorites', documents);
      this.fullDocuments = this.documents = null;
      if (documents && documents.length) {
        this.fullDocuments = this.documents = documents;
      }
      // loading.dismiss();
    })
    .catch((error) => {
      console.log('getFavorites - sqlite.getMyFavorites catch', error);
      // loading.dismiss();
    });
  }

  async openFile(doc: any) {
    await this.utilsService.openFile(doc, this.user, this.subscription, () => this.getFavorites());
  }

  async removeFavorite(doc: any, indexDoc: number) {
    if (this.networkStatus === 'offline') return;
    await this.utilsService.removeFavorite(doc, this.subscription, () => this.getFavorites());
  }

  ionViewWillEnter() {
    this.refresh(false);
  }

}
