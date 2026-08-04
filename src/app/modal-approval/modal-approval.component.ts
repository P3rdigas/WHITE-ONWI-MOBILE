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
    // this.data = this.navParams.data.document;
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

    // TODO: Deploy the API
    this.apiService.postToApproveDocuments(data.DistributionID, obj)
    .then(async (response: any) => {
      console.log('postToApproveDocuments', response);

      if (response?.isReceived && response?.wasUnderstood) {
        const prepared = await this.utilsService.prepareDocumentsNew([response], 'myDocuments');
        if (prepared?.length) {
          await this.sqliteService.updateMyDocumentsList(prepared);
        }

        // TODO: Verify if it needs to update the myFavorites list too

        await this.sqliteService.deleteLastDocDistributed(response.DocumentID);
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
