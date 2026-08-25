import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'library',
    loadChildren: () => import('./library/library.module').then(m => m.LibraryPageModule)
  },
  {
    path: 'my-documents',
    loadChildren: () => import('./my-documents/my-documents.module').then(m => m.MyDocumentsPageModule)
  },
  {
    path: 'my-favorites',
    loadChildren: () => import('./my-favorites/my-favorites.module').then(m => m.MyFavoritesPageModule)
  },
  {
    path: 'last-docs',
    loadChildren: () => import('./last-docs/last-docs.module').then(m => m.LastDocsPageModule)
  },
  {
    path: 'pdf-viewer',
    loadChildren: () => import('./pdf-viewer/pdf-viewer.module').then( m => m.PdfViewerPageModule)
  },
  {
    path: 'reset-password',
    loadChildren: () => import('./reset-password/reset-password.module').then( m => m.ResetPasswordPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
