import { Component, OnInit } from '@angular/core';
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
  public acceptedDocuments: any = [];
  public notAcceptedDocuments: any = [];
  public networkStatus: any = 'offline';
  public search = '';

  constructor(
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

  async refresh(updateApi: boolean) {
    this.tabsFolders = 'My Favorites';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.search = '';

    const loading = await this.utilsService.createLoading();
    loading.present();

    if (updateApi) {
      await this.utilsService.getPermissionsOffline();
      await this.getFavoritesAPI();
    } else {
      await this.getFavorites();
    }

    loading.dismiss();
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

  // TODO: Accepting files must triggers an update of the favorites list probably
  async getFavorites() {
    // const loading = await this.utilsService.createLoading();
    // loading.present();

    this.sqlite.getMyFavorites().then((documents: any) => {
      this.fullDocuments = this.documents = null;
      this.acceptedDocuments = [];
      this.notAcceptedDocuments = [];

      if (documents && documents.length) {
        this.fullDocuments = [...documents];
        this.applySort();
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

  private applySort() {
    const sorted = [...this.fullDocuments].sort((a: any, b: any) =>
      this.utilsService.getDocSortKey(a).localeCompare(this.utilsService.getDocSortKey(b))
    );

    this.notAcceptedDocuments = sorted.filter((doc: any) => !doc.isReceived || !doc.wasUnderstood);
    this.acceptedDocuments = sorted.filter((doc: any) => doc.isReceived && doc.wasUnderstood);;
  }

}
