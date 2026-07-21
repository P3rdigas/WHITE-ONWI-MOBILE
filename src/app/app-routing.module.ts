import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthenticationService } from './services/authentication/authentication.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'subscription',
    pathMatch: 'full'
  },
  {
    path: 'subscription',
    loadChildren: () => import('./subscription/subscription.module').then(m => m.SubscriptionPageModule),
    canActivate: [AuthenticationService]
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
    path: 'folder/:id',
    loadChildren: () => import('./folder/folder.module').then( m => m.FolderPageModule)
  },
  {
    path: 'pdf-viewer',
    loadChildren: () => import('./pdf-viewer/pdf-viewer.module').then( m => m.PdfViewerPageModule)
  },
  {
    path: 'reset-password/:token',
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
