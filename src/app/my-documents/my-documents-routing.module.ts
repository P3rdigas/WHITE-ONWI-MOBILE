import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MyDocumentsPage } from './my-documents.page';

const routes: Routes = [
  {
    path: '',
    component: MyDocumentsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MyDocumentsPageRoutingModule {}
