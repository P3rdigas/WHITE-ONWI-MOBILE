import { Component, OnInit } from '@angular/core';
import { UtilsService } from '../services/utils/utils.service';
import { NavController } from '@ionic/angular';
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
  public folders: any[] = [];
  public filteredFolders: any[] = [];
  public networkStatus: any = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  public search = '';

  constructor(
    private utilsService: UtilsService,
    private apiService: ApiService,
    private events: Events,
    private sqlite: SqliteService,
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
    this.events.subscribe('updateFolders', (folders) => {
      this.loadFolders();
    })
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

  toggleFolder(folder: any) {
    folder.open = !folder.open;
  }

  getDocumentsOfFolder(folder: any): any[] {
    if (!this.fullDocuments) return [];
    return this.utilsService.filterFolder(this.fullDocuments, folder);
  }

  getTotalDocumentsOfFolder(folder: any): number {
    if (!this.fullDocuments) return 0;
    const direct = this.utilsService.filterFolder(this.fullDocuments, folder).length;
    const children = folder.children?.reduce((sum: number, child: any) => sum + this.getTotalDocumentsOfFolder(child), 0) ?? 0;
    return direct + children;
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  refresh(updateApi?) {
    this.tabsFolders = 'Library';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.search = '';
    if (updateApi) {
      this.utilsService.updateFolders();
      this.utilsService.getPermissionsOffline();
      this.getDocumentsAPI();
    } else {
      this.loadFolders();
      this.getDocuments();
    }
  }

  updateFilters() {
    this.documents = this.fullDocuments;

    if (this.search && this.search != '') {
      // Filter matching docs
      this.documents = this.utilsService.filterDocumentSearch(this.fullDocuments, this.search);

      this.filteredFolders = this.filterFoldersWithResults(this.folders, this.documents);
    } else {
      this.closeAllFolders(this.folders);
      this.filteredFolders = this.folders;
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
        this.fullDocuments = this.documents = [...documents].sort((a: any, b: any) => 
          this.utilsService.getDocSortKey(a).localeCompare(this.utilsService.getDocSortKey(b))
        );
      }

      this.updateFilters();
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

  private async loadFolders() {
    this.folders = await this.utilsService.prepareMenuFolders(null) || [];
    this.filteredFolders = this.folders;
  }

  private filterFoldersWithResults(folders: any[], matchedDocs: any[]): any[] {
    const result = [];
    for (const folder of folders) {
      const hasDirectDocs = matchedDocs.some(doc => doc.DocumentFolderID === folder.FolderID);
      const matchingChildren = folder.children?.length
        ? this.filterFoldersWithResults(folder.children, matchedDocs)
        : [];

      if (hasDirectDocs || matchingChildren.length) {
        result.push({ ...folder, open: true, children: matchingChildren });
      }
    }
    return result;
  }

  private closeAllFolders(folders: any[]) {
    for (const folder of folders) {
      folder.open = false;
      if (folder.children?.length) this.closeAllFolders(folder.children);
    }
  }

}
