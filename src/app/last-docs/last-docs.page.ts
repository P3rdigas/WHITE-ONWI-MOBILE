import { Component, OnInit } from '@angular/core';
import { MenuController, ModalController, NavController } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { Events } from '../services/events/events';
import { ModalApprovalComponent } from '../modal-approval/modal-approval.component';
// import { Badge } from '@ionic-native/badge/ngx';
import { SqliteService } from '../services/sqlite/sqlite.service';
import { BaseDocumentPage } from '../base-document.page';
import { UtilsService } from '../services/utils/utils.service';
// import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

@Component({
  selector: 'app-last-docs',
  templateUrl: './last-docs.page.html',
  styleUrls: ['./last-docs.page.scss'],
  standalone: false
})
export class LastDocsPage extends BaseDocumentPage implements OnInit {
  public tabsFolders = 'Last Docs Distributed';
  public documents: any = null;
  public fullDocuments: any = null;
  public search = '';

  constructor(
    utilsService: UtilsService,
    private apiService: ApiService,
    private sqlite: SqliteService,
    private events: Events,
    private menu: MenuController,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    // // private badge: Badge,
    // private localNotifications: LocalNotifications
  ) {
    super(utilsService);
    this.user = localStorage.getItem('onwi.User');
    this.networkStatus = localStorage.getItem('onwi.networkStatus') ? localStorage.getItem('onwi.networkStatus') : 'offline';
  }

  ngOnInit() {
    this.menu.enable(false);

    const user = this.utilsService.initUserSession();
    if (!user) return;
    this.user = user;

    this.events.subscribe('changeNetworkStatus', (status) => {
      // console.log('events.subscribe changeNetworkStatus', status);
      this.networkStatus = status;
    });
    this.events.subscribe('updateMyFavorites', (folders) => {
      console.log('events.subscribe updateMyFavorites', folders);
      this.getDocuments();
    });
    this.events.subscribe('updateLastDocs', (folders) => {
      console.log('events.subscribe updateLastDocs', folders);
      this.getDocuments();
    });
  }

  exit() {
    this.utilsService.exitApp('interno', true);
  }

  async refresh(updateApi: boolean) {
    this.networkStatus = localStorage.getItem('onwi.networkStatus');
    this.tabsFolders = 'Last Docs Distributed';
    this.search = '';

    const loading = await this.utilsService.createLoading();
    loading.present();

    if (updateApi) {
      await this.utilsService.getPermissionsOffline();
      await this.getDocumentsAPI();
    } else {
      await this.getDocuments();
    }

    loading.dismiss();
  }

  inputFilterSearch() {
    this.documents = this.utilsService.filterDocumentSearch(this.documents, this.search);
  }

  async getDocumentsAPI() {
    await this.utilsService.fetchAndStoreDocuments({
      networkStatus: this.networkStatus,
      apiCall: () => this.apiService.getToApproveDocuments(this.user.ID),
      listType: 'lastDocsDistributed',
      storeCall: (docs) => this.sqlite.updateLastDocsDistributedList(docs),
      //postProcess: (docs) => this.syncNewFavorites(docs),
      refreshCall: () => this.getDocuments()
    });

    // this.localNotifications.clear(9999);
    // console.log(JSON.parse(result.data).value);

    // console.log(this.documents);
    // this.localNotifications.schedule({
    //   id: 9999,
    //   title: 'Documents to approve',
    //   text: 'Check the Last Docs Distributed to approve your documents. You have ' + response2.length + ' pending document(s).',
    //   badge: response2.length,
    //   priority: 1
    // });
  }

  async getDocuments() {
    this.sqlite.getLastDocsDistributed().then((documents: any) => {
      if (documents && documents.length) {
        this.fullDocuments = this.documents = documents;
      } else {
        this.fullDocuments = this.documents = null;
      }
    })
    .catch((error) => {
      console.log('getDocuments - sqlite.getLastDocsDistributed catch', error);
    });
  }

  async approveDoc(doc) {
    const canProceed = await this.canProceedWithNetwork(
      this.networkStatus,
      'You need an internet connection to approve documents.',
      'Do you want to approve the document using mobile data?'
    );
    if (!canProceed) return;

    const modal = await this.modalCtrl.create({
      component: ModalApprovalComponent,
      componentProps: {
        document: doc
      }
    });
    modal.present();

    modal.onDidDismiss().then((dataReturned) => {
      if (dataReturned.data === 'Updated') {
        this.refresh(false);
      }
    });
  }

  async openFile(doc: any) {
    await this.utilsService.openFile(doc, this.user, () => this.getDocuments());
  }

  ionViewWillEnter() {
    // this.networkStatus = localStorage.getItem('onwi.networkStatus');
    // // Se estiver offline redireciono para próxima aba
    // if (this.networkStatus === 'offline') {
    //   this.navCtrl.navigateRoot(['/my-documents']);
    // }
    this.refresh(false);
  }

  private async syncNewFavorites(docs: any[]): Promise<any[]> {
    console.log("Sync new favorites.....");
    for (const doc of docs) {
      const favorites = await this.sqlite.getMyFavorites(doc.DocumentID) ?? [];

      let isFav = favorites.some((fav: any) => fav.DocumentVersionID === doc.DocumentVersionID);

      if (favorites.length > 0 && !isFav) {
        await this.utilsService.addFavorite(doc, this.user);
      }
    }

    await this.utilsService.backgroundUpdateFavorites();

    return docs;
  }
}
