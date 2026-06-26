import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MyDocumentsPageRoutingModule } from './my-documents-routing.module';

import { MyDocumentsPage } from './my-documents.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MyDocumentsPageRoutingModule
  ],
  declarations: [MyDocumentsPage]
})
export class MyDocumentsPageModule {}
