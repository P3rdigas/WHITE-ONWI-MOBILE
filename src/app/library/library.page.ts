import { Component, OnInit } from '@angular/core';
import { UtilsService } from '../services/utils/utils.service';
import { MenuController, NavController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { BaseDocumentPage } from '../base-document.page';

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  standalone: false
})
export class LibraryPage extends BaseDocumentPage implements OnInit {
  public user: any = localStorage.getItem('onwi.User');
  public subscription: any = localStorage.getItem('onwi.Subscription');
  public tabsFolders = 'Library';
  public documents: any = null;
  public fullDocuments: any = null;
  public selectedFolder: any = null;
  public networkStatus: any = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  public search = '';

  constructor(
    private utilsService: UtilsService,
    private apiService: ApiService,
    private events: Events,
    private sqlite: SqliteService,
    private menu: MenuController,
    private navCtrl: NavController,
  ) {
    super();
  }

  ngOnInit() {
    const session = this.utilsService.initUserSession();
    if (!session) return;
    this.user = session.user;
    this.subscription = session.subscription;

    // Filter folders
    this.events.subscribe('selectedFolder', (folder) => {
      // console.log('library selectedFolder', folder);
      this.selectedFolder = folder;
      this.updateFilters();
    });
    this.events.subscribe('updateFolders', (folders) => {
      this.menu.enable(true);
    });
    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateLibrary', (folders) => {
      console.log('events.subscribe updateLibrary', folders);
      this.getDocuments();
    });
    this.events.subscribe('updateMyFavorites', (folders) => {
      console.log('events.subscribe updateMyFavorites', folders);
      this.getDocuments();
    });
  }

  openMenu() {
    this.menu.open();
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  refresh(updateApi?) {
    this.tabsFolders = 'Library';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.search = '';
    this.selectedFolder = null;
    if (updateApi) {
      this.utilsService.updateFolders();
      this.utilsService.getPermissionsOffline();
      this.getDocumentsAPI();
    } else {
      this.getDocuments();
    }
  }

  updateFilters() {
    this.documents = this.fullDocuments;
    // Filtro por pasta se selecionado
    if (this.selectedFolder) {
      this.documents = this.utilsService.filterFolder(this.documents, this.selectedFolder);
    }
    // Filtro pela busca se preenchida
    if (this.search && this.search != '') {
      this.documents = this.utilsService.filterDocumentSearch(this.documents, this.search);
    }
  }

  async getDocumentsAPI(): Promise<void> {
    await this.utilsService.fetchAndStoreDocuments({
      networkStatus: this.networkStatus,
      apiCall: () => this.apiService.getDocuments(this.subscription.OdataUser, this.subscription.OdataPassword),
      listType: 'library',
      storeCall: (docs) => this.sqlite.updateLibraryList(docs),
      postProcess: (docs) => this.utilsService.filterDocumentLastVersion(docs),
      refreshCall: () => this.getDocuments()
    });
  }

  async getDocuments() {
    this.sqlite.getLibrary().then((documents: any) => {
      console.log('getDocuments getLibrary', documents);
      this.fullDocuments = this.documents = null;
      if (documents && documents.length) {
        this.fullDocuments = this.documents = documents;
        // Filtro por pasta e busca se selecionado
        this.updateFilters();
      }
    })
    .catch((error) => {
      console.log('getDocuments - sqlite.getLibrary catch', error);
    });
  }

  async openFile(doc: any) {
    await this.utilsService.openFile(doc, this.user, this.subscription);
  }

  async addFavorite(doc: any, indexDoc?: number) {
    if (this.networkStatus === 'offline') return;
    await this.utilsService.addFavorite(doc, this.user, this.subscription);
  }

  async removeFavorite(doc: any, indexDoc?: number) {
    if (this.networkStatus === 'offline') return;
    await this.utilsService.removeFavorite(doc, this.subscription);
  }

  ionViewWillEnter() {
    this.refresh(false);

    // Se não for viewer ou estiver offline redireciono para próxima aba
    if (!this.user.isViewer || this.networkStatus === 'offline') {
      this.navCtrl.navigateRoot(['/my-documents', 'nao']);
    }
  }

}
