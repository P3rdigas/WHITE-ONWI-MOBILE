import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { UtilsService } from '../services/utils/utils.service';
import { SqliteService } from '../services/sqlite/sqlite.service';

@Component({
  selector: 'app-modal-approval',
  templateUrl: './modal-approval.component.html',
  styleUrls: ['./modal-approval.component.scss'],
  standalone: false
})
export class ModalApprovalComponent implements OnInit {
  public data: any = { isReceived: false, wasUnderstood: false, Comments: '' };

  constructor(
    private modalCtrl: ModalController,
    private navParams: NavParams,
    private apiService: ApiService,
    private utilsService: UtilsService,
    private sqliteService: SqliteService
  ) { }

  ngOnInit() {
    this.data = this.navParams.data['document'];
    this.data.isReceived = this.data.isReceived == 'true' ? true : false;
    this.data.wasUnderstood = this.data.wasUnderstood == 'true' ? true : false;
  }

  async postApprove(data: any) {
    if (!this.data.isReceived) {
      const toast = await this.utilsService.createToast('You must accept before submitting.');
      toast.present();
      return;
    }

    const loading = await this.utilsService.createLoading();
    loading.present();

    const obj = {
      isReceived: this.data.isReceived,
      wasUnderstood: this.data.wasUnderstood,
      Comments: this.data.Comments,
    };

    this.apiService.postToApproveDocuments(data.DistributionID, obj)
    .then(async (response: any) => {
      if (response?.isReceived && response?.wasUnderstood) {
        const prepared = await this.utilsService.prepareDocumentsNew([response], 'modalApproval');

        if (prepared && prepared.length) {
          const prepDoc = prepared[0];

          // Update my documents
          const doc = await this.sqliteService.getMyDocuments(prepDoc.DocumentID);
          if (doc && doc.length) {
            const oldDoc = doc[0];

            const pDate = new Date(prepDoc.Date);
            const dDate = new Date(oldDoc.DocumentDate);

            if (prepDoc.DocumentVersionID !== oldDoc.DocumentVersionID && pDate.getTime() > dDate.getTime()) {
              await this.sqliteService.updateMyDocumentsList([prepDoc]);
              await this.utilsService.removeLocalFile(oldDoc);
            }            
          }

          // Update my favorites
          const favDoc = await this.sqliteService.getMyFavorites(prepDoc.DocumentID);
          if (favDoc && favDoc.length) {
            const oldFavDoc = favDoc[0];

            if (prepDoc.DocumentVersionID === oldFavDoc.DocumentVersionID) {
              await this.sqliteService.updateMyFavoritesList([prepDoc]);
            }            
          }

          // Update last docs
          await this.sqliteService.deleteLastDocDistributed(prepDoc.DocumentVersionID);
        }
      }

      loading.dismiss();
      this.exit('Updated');
    })
    .catch(async (error) => {
      loading.dismiss();
      const alert = await this.utilsService.createAlert('Something went wrong', 'Please, try again latter.');
      alert.present();
    });
  }

  exit(onClose?: any) {
    this.modalCtrl.dismiss(onClose);
  }
}
