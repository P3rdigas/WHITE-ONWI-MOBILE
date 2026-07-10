import { Component, OnInit } from '@angular/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { UtilsService } from '../services/utils/utils.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.page.html',
  styleUrls: ['./pdf-viewer.page.scss'],
  standalone: false
})
export class PdfViewerPage implements OnInit {
  pdfBase64: string = '';
  fileName: string = '';
  canDownload: boolean = false;
  canPrint: boolean = false;

  constructor(
    private utilsService: UtilsService
  ) { }

  ngOnInit() {
    const state = history.state;

    if (state?.pdfBase64) {
      this.pdfBase64 = state.pdfBase64;
      this.fileName = state.fileName;
      this.canDownload = state.canDownload;
      this.canPrint = state.canPrint;
    }
  }

  async saveAs() {
    const alertTitle = 'Save Document';
    // TODO: pass the classification of the document to the alert message
    const alertMessage = 'Are you sure you want to save it? The document is property and contains information considered ...';
    
    const alert = await this.utilsService.createAlert(alertTitle, alertMessage, [
      { text: 'Cancel', role: 'cancel' },
      { text: 'I understand', role: 'confirm' }
    ]);
    await alert.present();

    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') {
      return;
    }

    const loading = await this.utilsService.createLoading();
    await loading.present();

    try {
      const base64Data = this.pdfBase64.includes(',') ? this.pdfBase64.split(',')[1] : this.pdfBase64;

      const fileName = this.fileName || 'document.pdf';
      const uniquePath = await this.getUniqueFilePath(fileName, Directory.Documents);

      await Filesystem.writeFile({
        path: uniquePath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();

      const errAlertTitle = 'Something went wrong';
      const errAlertMessage = 'Error while saving the document. Please try again later.';

      const errAlert = await this.utilsService.createAlert(errAlertTitle, errAlertMessage);
      await errAlert.present();
    }
  }

  private async getUniqueFilePath(baseName: string, directory: Directory, folder: string = 'onwi'): Promise<string> {
    const dotIndex = baseName.lastIndexOf('.');
    const name = dotIndex !== -1 ? baseName.substring(0, dotIndex) : baseName;
    const ext = dotIndex !== -1 ? baseName.substring(dotIndex) : '';

    let path = `${folder}/${baseName}`;
    let counter = 1;

    while (await this.fileExists(path, directory)) {
      path = `${folder}/${name} (${counter})${ext}`;
      counter++;
    }

    return path;
  }

  private async fileExists(path: string, directory: Directory): Promise<boolean> {
    try {
      await Filesystem.stat({ path, directory });
      return true;
    } catch (error) {
      return false;
    }
  }

}
