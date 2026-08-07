import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
// import { SplashScreen } from '@ionic-native/splash-screen/ngx';
// import { StatusBar } from '@ionic-native/status-bar/ngx';
// import { Device } from '@ionic-native/device/ngx';
// import { AppVersion } from '@ionic-native/app-version/ngx';
// import { Network } from '@ionic-native/network/ngx';
// import { File } from '@ionic-native/file/ngx';
// import { FileOpener } from '@ionic-native/file-opener/ngx';
// import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
// // import { Badge } from '@ionic-native/badge/ngx';
// import { SQLite } from '@ionic-native/sqlite/ngx';
// import { HTTP } from '@ionic-native/http/ngx';
// import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LoadingProgressComponent } from './components/loading-progress/loading-progress.component';

@NgModule({
  declarations: [AppComponent, LoadingProgressComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [
    // SplashScreen,
    // StatusBar,
    // Device,
    // AppVersion,
    // Network,
    // File,
    // FileOpener,
    // InAppBrowser,
    // // Badge,
    // SQLite,
    // HTTP,
    // LocalNotifications,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
