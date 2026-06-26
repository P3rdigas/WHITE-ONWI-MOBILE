import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LastDocsPageRoutingModule } from './last-docs-routing.module';

import { LastDocsPage } from './last-docs.page';
import { ModalApprovalComponent } from '../modal-approval/modal-approval.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LastDocsPageRoutingModule
  ],
  declarations: [LastDocsPage, ModalApprovalComponent],
  // entryComponents: [ModalApprovalComponent]
})
export class LastDocsPageModule {}
