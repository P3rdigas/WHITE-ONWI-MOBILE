import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { UtilsService } from '../services/utils/utils.service';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { ActivatedRoute } from '@angular/router';
import { BaseDocumentPage } from '../base-document.page';
import { SortMode, ViewMode } from 'src/types/types';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-my-documents',
  templateUrl: './my-documents.page.html',
  styleUrls: ['./my-documents.page.scss'],
  standalone: false
})
export class MyDocumentsPage extends BaseDocumentPage implements OnInit {
  public tabsFolders = 'My Documents';
  public documents: any = null;
  public fullDocuments: any = null;
  public folders: any[] = [];
  public filteredFolders: any[] = [];
  public viewMode: ViewMode = 'list';
  public sortMode: SortMode = 'alphabetic';
  public search = '';

  constructor(
    utilsService: UtilsService,
    private apiService: ApiService,
    private sqlite: SqliteService,
    private events: Events,
    private route: ActivatedRoute,
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

    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateFolders', () => {
      // console.log('events.subscribe updateFolders MyDocuments', folders);
      this.loadFolders();
    });
    this.events.subscribe('updateMyDocuments', (folders) => {
      // console.log('events.subscribe updateMyDocuments MyDocuments', folders);
      this.getDocuments();
    });
    this.events.subscribe('updateMyFavorites', (folders) => {
      // console.log('events.subscribe updateMyFavorites MyDocuments', folders);
      this.getDocuments();
    });
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'folder' ? 'list' : 'folder';
    this.updateFilters();
  }

  toggleSortMode() {
    if (this.sortMode === 'alphabetic') {
      this.sortMode = 'newest';
    } else if (this.sortMode === 'newest') {
      this.sortMode = 'oldest';
    } else {
      this.sortMode = 'alphabetic';
    }

    this.applySortAndFilter();
  }

  get sortIcon(): string {
    if (this.sortMode === 'newest') return 'assets/icons/newest.svg';
    if (this.sortMode === 'oldest') return 'assets/icons/oldest.svg';
    return 'assets/icons/alphabetic.svg';
  }

  toggleFolder(folder: any) {
    folder.open = !folder.open;
  }

  getDocumentsOfFolder(folder: any): any[] {
    if (!this.documents) return [];
    return this.utilsService.filterFolder(this.documents, folder);
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
    this.tabsFolders = 'My Documents';
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
    this.documents = this.fullDocuments ?? [];

    if (this.viewMode === 'folder') {
      if (this.search && this.search !== '') {
        this.documents = this.utilsService.filterDocumentSearch(this.fullDocuments ?? [], this.search);

        // Open folders by default
        this.filteredFolders = this.filterFoldersWithResults(this.folders, this.documents, true);
      } else {
        // Close folders by default
        this.filteredFolders = this.filterFoldersWithResults(this.folders, this.fullDocuments ?? [], false);
      }
    } else {
      if (this.search && this.search !== '') {
        this.documents = this.utilsService.filterDocumentSearch(this.documents, this.search);
      }
    }
  }

  async getDocumentsAPI() {
    await this.utilsService.fetchAndStoreDocuments({
      networkStatus: this.networkStatus,
      apiCall: () => this.apiService.getDistributedDocuments(this.user.ID),
      listType: 'myDocuments',
      storeCall: (docs) => this.sqlite.updateMyDocumentsList(docs),
      refreshCall: () => this.getDocuments()
    });
  }

  async getDocuments() {
    this.sqlite.getMyDocuments().then((documents: any) => {
      this.fullDocuments = this.documents = null;
      if (documents && documents.length) {
        this.fullDocuments = this.documents = [...documents].sort((a: any, b: any) => 
          this.utilsService.getDocSortKey(a).localeCompare(this.utilsService.getDocSortKey(b))
        );
      }

      this.updateFilters();
    })
    .catch((error) => {
      console.log('getDocuments - sqlite.getMyDocuments catch', error);
    });
  }

  async openFile(doc: any) {
    await this.utilsService.openFile(doc, this.user);
  }

  async ionViewWillEnter() {
    this.refresh(false);
  }

  private async loadFolders() {
    this.folders = await this.utilsService.prepareMenuFolders(null) || [];
    this.filteredFolders = this.filterFoldersWithResults(this.folders, this.fullDocuments || [], false);
  }

  private filterFoldersWithResults(folders: any[], matchedDocs: any[], autoOpen = false): any[] {
    const result = [];
    for (const folder of folders) {
      const hasDirectDocs = matchedDocs.some(doc => doc.DocumentFolderID === folder.FolderID);
      const matchingChildren = folder.children?.length
        ? this.filterFoldersWithResults(folder.children, matchedDocs, autoOpen)
        : [];
      
      if (hasDirectDocs || matchingChildren.length) {
        result.push({ ...folder, open: autoOpen, children: matchingChildren });
      }
    }

    return result;
  }

  private applySortAndFilter() {
    let sorted = [...this.fullDocuments];

    if (this.sortMode === 'alphabetic') {
      sorted.sort((a: any, b: any) => this.utilsService.getDocSortKey(a).localeCompare(this.utilsService.getDocSortKey(b)));
    } else if (this.sortMode === 'newest') {
      sorted.sort((a: any, b: any) => {
        const dateA = new Date(a.DocumentDate);
        const dateB = new Date(b.DocumentDate);
        return dateB.getTime() - dateA.getTime();
      });
    } else {
      sorted.sort((a: any, b: any) => {
        const dateA = new Date(a.DocumentDate);
        const dateB = new Date(b.DocumentDate);
        return dateA.getTime() - dateB.getTime();
      });
    }

    this.fullDocuments = sorted;
    this.updateFilters();
  }

  private getTotalDocumentsOfFolder(folder: any): number {
    if (!this.fullDocuments) return 0;
    const direct = this.utilsService.filterFolder(this.fullDocuments, folder).length;
    const children = folder.children?.reduce((sum: number, child: any) => sum + this.getTotalDocumentsOfFolder(child), 0) ?? 0;
    return direct + children;
  }
}
