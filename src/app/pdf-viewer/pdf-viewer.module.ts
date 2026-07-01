import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IonicModule } from '@ionic/angular';

import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';

import { PdfViewerPageRoutingModule } from './pdf-viewer-routing.module';

import { PdfViewerPage } from './pdf-viewer.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    NgxExtendedPdfViewerModule,
    PdfViewerPageRoutingModule
  ],
  declarations: [PdfViewerPage]
})
export class PdfViewerPageModule {}
