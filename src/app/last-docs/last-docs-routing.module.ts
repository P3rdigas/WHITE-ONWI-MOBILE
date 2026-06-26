import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LastDocsPage } from './last-docs.page';

const routes: Routes = [
  {
    path: '',
    component: LastDocsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LastDocsPageRoutingModule {}
