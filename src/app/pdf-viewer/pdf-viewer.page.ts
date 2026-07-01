import { Component, OnInit } from '@angular/core';

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

  constructor() { }

  ngOnInit() {
    const state = history.state;

    if (state?.pdfBase64) {
      this.pdfBase64 = state.pdfBase64;
      this.fileName = state.fileName;
      this.canDownload = state.canDownload;
      this.canPrint = state.canPrint;
    }
  }

}
