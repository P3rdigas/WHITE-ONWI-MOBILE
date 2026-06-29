import { Component, OnInit } from '@angular/core';
import { MenuController, Platform } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { UtilsService } from '../services/utils/utils.service';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { ActivatedRoute } from '@angular/router';
import { BaseDocumentPage } from '../base-document.page';

@Component({
  selector: 'app-my-documents',
  templateUrl: './my-documents.page.html',
  styleUrls: ['./my-documents.page.scss'],
  standalone: false
})
export class MyDocumentsPage extends BaseDocumentPage implements OnInit {
  public user: any = localStorage.getItem('onwi.User');
  public subscription: any = localStorage.getItem('onwi.Subscription');
  public tabsFolders = 'My Documents';
  public documents: any = null;
  public fullDocuments: any = null;
  public selectedFolder: any = null;
  public networkStatus: any = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  public search = '';
  public firstLogin = 'no';
  public statusUpdateAPI = {
    myDocuments: false, myFavorites: false, library: false, lastDocs: false, folders: false
  };

  constructor(
    private utilsService: UtilsService,
    private apiService: ApiService,
    private sqlite: SqliteService,
    private events: Events,
    private menu: MenuController,
    private route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit() {
    const session = this.utilsService.initUserSession();
    if (!session) return;
    this.user = session.user;
    this.subscription = session.subscription;

    // TODO:
    // Filter folders
    this.events.subscribe('selectedFolder', (folder) => {
      // console.log('myDocuments selectedFolder', folder);
      this.selectedFolder = folder;
      this.updateFilters();
    });
    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateFolders', (folders) => {
      // console.log('events.subscribe updateFolders MyDocuments', folders);
      this.statusUpdateAPI.folders = true;
      this.menu.enable(true);
    });
    this.events.subscribe('updateMyDocuments', (folders) => {
      // console.log('events.subscribe updateMyDocuments MyDocuments', folders);
      this.statusUpdateAPI.myDocuments = true;
      this.getDocuments();
    });
    this.events.subscribe('updateLibrary', (folders) => {
      // console.log('events.subscribe updateLibrary MyDocuments', folders);
      this.statusUpdateAPI.library = true;
    });
    this.events.subscribe('updateMyFavorites', (folders) => {
      // console.log('events.subscribe updateMyFavorites MyDocuments', folders);
      this.statusUpdateAPI.myFavorites = true;
      this.getDocuments();
    });
    this.events.subscribe('updateLastDocs', (folders) => {
      // console.log('events.subscribe updateLastDocs MyDocuments', folders);
      this.statusUpdateAPI.lastDocs = true;
    });
  }

  openMenu() {
    if (this.firstLogin == 'yes') {
      if (this.statusUpdateAPI.folders) {
        this.menu.open();
      }
    } else {
      this.menu.open();
    }
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  refresh(updateApi?) {
    this.tabsFolders = 'My Documents';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.search = '';
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

  async getDocumentsAPI() {
    await this.utilsService.fetchAndStoreDocuments({
      networkStatus: this.networkStatus,
      apiCall: () => this.apiService.getDistributedDocuments(this.subscription.OdataUser, this.subscription.OdataPassword, this.user.ID),
      listType: 'myDocuments',
      storeCall: (docs) => this.sqlite.updateMyDocumentsList(docs),
      onSuccess: () => { this.statusUpdateAPI.myDocuments = true; },
      refreshCall: () => this.getDocuments()
    });
  }

  async getDocuments() {
    this.sqlite.getMyDocuments().then((documents: any) => {
      console.log('getMyDocuments', documents);
      this.fullDocuments = this.documents = null;
      if (documents && documents.length) {
        this.fullDocuments = this.documents = documents;
      }
      // Filtro por pasta e busca se selecionado
      this.updateFilters();
    })
    .catch((error) => {
      console.log('getDocuments - sqlite.getMyDocuments catch', error);
    });
  }

  async openFile(doc: any) {
    await this.utilsService.openFile(doc, this.user, this.subscription);
  }

  async addFavorite(doc: any, indexDoc: number) {
    if (this.networkStatus === 'offline') return;
    await this.utilsService.addFavorite(doc, this.user, this.subscription);
  }

  async removeFavorite(doc: any, indexDoc: number) {
    if (this.networkStatus === 'offline') return;
    await this.utilsService.removeFavorite(doc, this.subscription);
  }

  async ionViewWillEnter() {

    //this.firstLogin = await firstValueFrom(this.route.paramMap.pipe(map(params => params.get('firstLogin'))));

    this.route.paramMap.subscribe(params => {
      this.firstLogin = params.get('firstLogin');
    });
    console.log('firstLogin', this.firstLogin);

    this.refresh(false);
    
    if (this.firstLogin == 'no') {
      this.menu.enable(true);
    } else {
      // Update Permissions, Folders, MyDocuments, MyFavorites, Library, Last Docs
      this.utilsService.getPermissionsOffline();
      this.utilsService.updateFolders();
      this.utilsService.backgroundUpdateMyDocuments();
      this.utilsService.backgroundUpdateFavorites();
      this.utilsService.backgroundUpdateLibrary();
      this.utilsService.backgroundUpdateLastDocsDistributed();
    }
  }
}
