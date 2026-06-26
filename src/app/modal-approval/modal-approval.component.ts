import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { ApiService } from '../services/api/api.service';
import { UtilsService } from '../services/utils/utils.service';

@Component({
  selector: 'app-modal-approval',
  templateUrl: './modal-approval.component.html',
  styleUrls: ['./modal-approval.component.scss'],
  standalone: false
})
export class ModalApprovalComponent implements OnInit {
  public data: any = { isReceived: false, wasUnderstood: false, Comments: '' };
  private subscription: any = localStorage.getItem('onwi.Subscription');
  private result: any;

  constructor(
    private modalCtrl: ModalController,
    private navParams: NavParams,
    private apiService: ApiService,
    private utilsService: UtilsService
  ) { }

  ngOnInit() {
    // this.data = this.navParams.data.document;
    this.data = this.navParams.data['document'];
    this.data.isReceived = this.data.isReceived == 'true' ? true : false;
    this.data.wasUnderstood = this.data.wasUnderstood == 'true' ? true : false;
    this.subscription = JSON.parse(this.subscription);
  }

  //async postApprove(data) {
  async postApprove(data: any) {
    console.log(data);
    const loading = await this.utilsService.createLoading();
    loading.present();

    let timeNow = new Date();
    const obj = {
      isReceived: this.data.isReceived,
      ReceivedDate: timeNow.toJSON(),
      wasUnderstood: this.data.wasUnderstood,
      Comments: this.data.Comments,
    };
    // console.log('obj', obj);

    this.apiService.postToApproveDocuments(this.subscription.OdataUser, this.subscription.OdataPassword, data.DistributionID, obj)
    .then(async (response) => {
      this.result = response;
      // console.log('postToApproveDocuments', this.result);
      loading.dismiss();
      this.exit('Updated');
      // if (this.result.value.length) {
      // } else {
      //   const alert = await this.utilsService.createAlert('Something went wrong', 'onwi Mobile is desactivated please contact your company\'s IT Department');
      //   alert.present();
      // }
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
