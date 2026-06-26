import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SubscriptionPageRoutingModule } from './subscription-routing.module';

import { SubscriptionPage } from './subscription.page';

// import { BrMaskerModule } from 'br-mask';

// import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    // BrMaskerModule,
    SubscriptionPageRoutingModule
  ],
  declarations: [SubscriptionPage],
  providers: [
    // InAppBrowser
  ]
})
export class SubscriptionPageModule {}
