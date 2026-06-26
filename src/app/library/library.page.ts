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

  // async testeDownload() {
  //   let path: any;
  //   if (this.platform.is('ios')) {
  //     // TO-DO - Testar se sincronizando resolve o acesso externo dos arquivos
  //     path = this.file.syncedDataDirectory;
  //   } else {
  //     // TO-DO - Permisson to write to external storage when it's not mounted on Marshmallow
  //     path = this.file.externalRootDirectory;
  //   }
  //   // TO-DO - Se as opções acima não funcionarem, verificar possibilidade de perguntar ao usuário onde salvar o arquivo

  //   // if (this.platform.is('ios')) {
  //   //   path = this.file.documentsDirectory;
  //   // } else {
  //   //   path = this.file.dataDirectory;
  //   // }
  //   // console.log('this.file.externalDataDirectory (SDCARD - precisa de permissão): ', this.file.externalDataDirectory);
  //   // console.log('this.file.dataDirectory NAAAAAO: ', this.file.dataDirectory);
  //   // console.log('this.file.applicationDirectory NAAAAAO: ', this.file.applicationDirectory);
  //   console.log('this.file.documentsDirectory: ', this.file.documentsDirectory);
  //   path += encodeURI('FCOM ATR_Rev10.0_Jul2020_Versão Consolidada.pdf');
  //   console.log('testeDownload path', path);

  //   // DocumentID | DocumentVersionID
  //   // this.apiService.getUrlFile(
  //   //   this.subscription.OdataUser, this.subscription.OdataPassword,
  //   //   this.user.ID,
  //   //   '3ecf1dc8-707e-4aee-b03a-c1aadc9edbdf', '6d012874-b955-4e16-be2d-626cd6488112'
  //   // )
  //   // .then(response => {
  //   //   console.log('testeDownload success', response);
  //   //   this.apiService.downloadFile(response.url, path).then(response2 => {
  //   //     console.log('testeDownload downloadFile BAIXOU', response2);
  //   //   })
  //   //   .catch(error => {
  //   //     console.log('testeDownload downloadFile error', error);
  //   //   });
  //   // })
  //   // .catch(error => {
  //   //   console.log('testeDownload error', error);
  //   // });

  //   this.apiService.downloadFile(
  //     this.subscription.OdataUser, this.subscription.OdataPassword,
  //     this.user.ID,
  //     '3ecf1dc8-707e-4aee-b03a-c1aadc9edbdf', '6d012874-b955-4e16-be2d-626cd6488112',
  //     path
  //   )
  //   .then(response => {
  //     console.log('testeDownload success', response);
  //   })
  //   .catch(error => {
  //     console.log('testeDownload error', error);
  //   });
  // }

  async testeDownload() {
    const alert = await this.utilsService.createAlert(
      'Unavailable',
      'Native file download testing is disabled in browser migration mode.'
    );
    alert.present();
  }

  ionViewWillEnter() {
    this.refresh(false);

    // Se não for viewer ou estiver offline redireciono para próxima aba
    if (!this.user.isViewer || this.networkStatus === 'offline') {
      this.navCtrl.navigateRoot(['/my-documents', 'nao']);
    }
  }

}
