import { Component, OnInit } from '@angular/core';
import { UtilsService } from '../services/utils/utils.service';
import { AlertController, NavController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { BaseDocumentPage } from '../base-document.page';
import { LibrarySyncService } from '../services/library-sync/library-sync.service';

@Component({
  selector: 'app-library',
  templateUrl: './library.page.html',
  styleUrls: ['./library.page.scss'],
  standalone: false
})
export class LibraryPage extends BaseDocumentPage implements OnInit {
  public tabsFolders = 'Library';
  public documents: any = null;
  public fullDocuments: any = null;
  public folders: any[] = [];
  public filteredFolders: any[] = [];
  public search = '';
  protected isUpdating: boolean = false;

  constructor(
    utilsService: UtilsService,
    private apiService: ApiService,
    private events: Events,
    private sqlite: SqliteService,
    private navCtrl: NavController,
    private librarySyncService: LibrarySyncService,
    private alertController: AlertController
  ) {
    super(utilsService);
    this.user = localStorage.getItem('onwi.User');
    this.networkStatus = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  }

  ngOnInit() {
    const user = this.utilsService.initUserSession();
    if (!user) return;
    this.user = user;

    this.librarySyncService.isUpdating$.subscribe(status => {
      const wasUpdating = this.isUpdating;
      this.isUpdating = status;

      if (wasUpdating && !status) {
        this.loadFolders();
        this.getDocuments();
      }
    });

    // Filter folders
    this.events.subscribe('updateFolders', () => {
      this.loadFolders();
    });
    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateLibrary', async (folders) => {
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

  getDocCountLabel(folder: any): string {
    const count = this.getTotalDocumentsOfFolder(folder);
    return `${count} ${count === 1 ? 'doc' : 'docs'}`;
  }

  async openDocInfo(doc: any, event: Event) {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: `${doc.DocumentTag} ${doc.DocumentDesignation}`,
      cssClass: 'doc-info-alert',
      message: `
        <div class="doc-info-row"><span>Latest version: </span><b>${doc.DocumentVersionIsLastVersion ? 'Yes' : 'No'}</b></div>
        <div class="doc-info-row"><span>Download status: </span><b>${doc.DownloadStatus ? doc.DownloadStatus : '-'}</b></div>
        <div class="doc-info-row"><span>Distributed on: </span><b>${this.utilsService.formatDate(doc.DocumentDate)}</b></div>
      `,
      buttons: ['Close']
    });
    await alert.present();
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  async refresh(updateApi: boolean) {
    this.tabsFolders = 'Library';
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.search = '';

    const loading = await this.utilsService.createLoading();
    loading.present();

    if (updateApi) {
      await this.utilsService.updateFolders();
      await this.utilsService.getPermissionsOffline();
      await this.getDocumentsAPI();
    } else {
      await this.loadFolders();
      await this.getDocuments();
    }

    loading.dismiss();
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
      apiCall: () => this.apiService.getDocuments(),
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
    await this.utilsService.openFile(doc, this.user);
  }

  ionViewWillEnter() {
    if (!this.user.isViewer) {
      this.navCtrl.navigateRoot(['/my-documents']);
      return;
    }

    if (!this.isUpdating) {
      this.refresh(false);
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
