import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController, NavController, Platform } from '@ionic/angular';
import { ApiService } from '../api/api.service';
import { Events } from '../events/events';
import { Filesystem, Directory } from '@capacitor/filesystem';
// import { File } from '@ionic-native/file/ngx';
// import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
// import { Badge } from '@ionic-native/badge/ngx';
import { Guid } from 'guid-typescript';
import { SqliteService } from '../sqlite/sqlite.service';
import { FileOpener } from '@capacitor-community/file-opener';
// import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  public updatingDownload = false;

  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private apiService: ApiService,
    private sqlite: SqliteService,
    private events: Events,
    private navCtrl: NavController,
    // private file: File,
    // private iab: InAppBrowser,
    // private badge: Badge,
    // private localNotifications: LocalNotifications
  ) { }

  initUserSession(): { user: any, subscription: any } {
    const userRaw = localStorage.getItem('onwi.User');

    if (!userRaw) {
      // Faz logout sem perguntar se deseja
      this.exitApp('externo', false);
      return null;
    }

    const user = JSON.parse(userRaw);
    const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
    user.Photo = user.Photo ? 'data:image/png;base64,' + user.Photo : 'assets/images/logo.png';
    subscription.CustomerImage = subscription.CustomerImage ? 'data:image/png;base64,' + subscription.CustomerImage : 'assets/images/logo.png';

    return { user, subscription };
  }

  async createLoading(title?: string, seconds?: number): Promise<HTMLIonLoadingElement> {
    return this.loadingController.create({
      message: title,
      duration: seconds,
      cssClass: 'loadingAlphacode',
      spinner: 'crescent'
    });
  }

  createToast(text: string, seconds = 2500) {
    const toast = this.toastController.create({
      cssClass: 'toastAlphacode',
      message: text,
      duration: seconds
    });
    return toast;
  }

  createAlert(title: string, text: string, optionButtons?: string[], subtitle?: string) {
    // console.log('createAlert');
    if (optionButtons === undefined) {
      optionButtons = ['OK'];
    }
    // console.log(optionButtons);
    const alert = this.alertController.create({
      cssClass: 'alertAlphacode',
      header: title,
      message: text,
      subHeader: subtitle,
      buttons: optionButtons
    });
    return alert;
  }

  encryptPassword(senha: string) {
    // console.log('senha', senha);
    let y = 0;
    let passEncrypted = '';
    const chaveEncrypt = 'slapps.2007!rg.14021974';

    if (chaveEncrypt.length > 250) {
      return false;
    }

    // For letra a letra
    const x = this.encodeCP1250(senha);
    for (let index = 0; index < x.length; index++) {
      y = x[index];
      // console.log('caracter Enconded', y);
      y += (chaveEncrypt.substr((index % chaveEncrypt.length) + 1, 1)).charCodeAt(0);
      // console.log('character Decoded', y);
      passEncrypted += String.fromCharCode(y && y);
      // console.log('passEncrypted', passEncrypted);
    }
    return passEncrypted;
  }

  uncryptPassword(senha: string) {
    // console.log('senha', senha);
    let y = 0;
    let passEncrypted = '';
    const chaveEncrypt = 'slapps.2007!rg.14021974';

    if (chaveEncrypt.length > 250) {
      return false;
    }

    // For letra a letra
    const x = this.encodeCP1250(senha);
    // console.log(x);

    for (let index = 0; index < x.length; index++) {
      y = x[index];
      // console.log('caracter Enconded', y);
      y -= (chaveEncrypt.substr((index % chaveEncrypt.length) + 1, 1)).charCodeAt(0);
      // console.log('character Decoded', y);
      passEncrypted += String.fromCharCode(y && y);
      // console.log('passEncrypted', passEncrypted);
    }
    return passEncrypted;
  }

  encodeCP1250(text) {
    // console.log('encodeCP1250');

    const cp1250 = '€ ‚ „…†‡ ‰Š‹ŚŤŽŹ ‘’“”•–— ™️š›śťžź ˇ˘Ł¤Ą¦§¨©️Ş«¬­®️Ż°±˛ł´µ¶·¸ąş»Ľ˝ľżŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢßŕáâăäĺćçčéęëěíîďđńňóôőö÷řůúűüýţ˙';
    let buf = [];
    for (let i = 0; i < text.length; i++) {
      // console.log('text[i]', text[i]);
      let code = cp1250.indexOf(text[i]);
      // console.log('code', code);
      if (code >= 0) {
        code += 128;
      } else {
        code = text.charCodeAt(i);
      }
      // console.log('code', code);
      buf.push(code > 255 ? 32 : code);
    }
    return buf;
  }

  filterDocumentSearch(docs: any[], search: string): any[] {
    return docs.filter(doc => {
      const tag = (doc.DocumentTag ?? '').toLowerCase();
      const name = (doc.DocumentDesignation ?? '').toLowerCase();
      const query = search.toLocaleLowerCase();
      return tag.includes(query) || name.includes(query);
    });
  }

  filterFolder(docs: any[], folder: any): any[] {
    try {
      return docs.filter(doc => doc.DocumentFolderID === folder.FolderID);
    } catch (error) {
      console.log('filterFolder error', error);
      return docs;
    }
  }

  async updateFolders() {
    console.log('utils updateFolders()');
    
    const subscriptionRaw = localStorage.getItem('onwi.Subscription');
    if (!subscriptionRaw) {
      return this.publishFolders();
    }

    const subscription = JSON.parse(subscriptionRaw);

    const loading = await this.createLoading();
    loading.present();

    this.apiService.getDocumentsFolders(subscription.OdataUser, subscription.OdataPassword)
    .then(async (response: any) => {
      await loading.dismiss();

      const folders = response?.value ?? [];

      await this.sqlite.updateFoldersList(folders);

      if (!folders.length) {
        const alert = await this.createAlert('Something went wrong', 'No folders found. Please contact your company\'s IT Department.');
        alert.present();
      }

      return this.publishFolders();
    })
    .catch(async (error) => {
      console.log('updateFolders error', error);
      await loading.dismiss();
      return this.publishFolders();
    });
  }

  async prepareMenuFolders(idParent: string | null): Promise<any[]> {
    const children: any[] = [];

    try {
      let foldersPile = await this.sqlite.getFolders();

      if (!foldersPile || !foldersPile.length) {
        return children;
      }

      for (const folder of foldersPile) {
        if (folder.ParentFolderID === idParent) {
          folder.children = await this.prepareMenuFolders(folder.FolderID);

          if (folder.children.length > 0) {
            folder.open = false;
            folder.icon = 'assets/images/md-arrow-dropdown.svg';
          }

          children.push(folder);
        }
      }

      // Sort the folders alphabetically
      children.sort((a, b) => a.Name.localCompare(b.Name));
    } catch (error) {
      console.log('prepareMenuFolders error', error);
    }

    return children;
  }

  async fetchAndStoreDocuments(options: {
    networkStatus: string;
    apiCall: () => Promise<any>;
    listType: string;
    storeCall: (docs: any[] | null) => Promise<void>;
    onSuccess?: () => void;
    postProcess?: (docs: any[]) => any[];
    refreshCall: () => Promise<void> | null;
  }): Promise<void> {
    const { networkStatus, apiCall, listType, storeCall, onSuccess, postProcess, refreshCall } = options;

    if (networkStatus === 'offline') {
      this.createToast('Connect on wifi or mobile network to update the documents list.');
      await refreshCall();
      return;
    }

    const loading = await this.createLoading();
    await loading.present();

    try {
      const response: any = await apiCall();
      const docs = response?.value ?? [];

      if (docs.length) {
        let prepared = await this.prepareDocumentsNew(docs, listType);
        console.log('prepareDocumentsNew', prepared);

        if (postProcess && prepared?.length) {
          prepared = postProcess(prepared);
        }

        if (onSuccess) {
          onSuccess();
        }

        await storeCall(prepared?.length ? prepared : null);
      } else {
        await storeCall(null);
      }

      await refreshCall();
    } catch (error) {
      console.log(`fetchAndStoreDocuments [${listType}] error: `, error);
      const alert = await this.createAlert('Something went wrong', 'Please, try again later.');
      await alert.present();
      refreshCall();
    } finally {
      await loading.dismiss();
    }
  }

  async prepareDocumentsNew(documents: any[], whereFrom: string) {
    console.log('>>>>>>>>>>>>> prepareDocumentsNew BEGAN <<<<<<<<<<<<<', documents, whereFrom);

    const documentsTemp: object[] = [];
    for (const doc of documents) {
      // TODO: Change in the API or in the Database (Table Files also has a typo)
      // Normalize API typo — API returns 'DocumentVersionExtention' (missing 's')
      doc.DocumentVersionExtension = doc.DocumentVersionExtension ?? doc.DocumentVersionExtention ?? null;

      doc.DocumentFavorite = false;
      doc.DownloadStatus = '';

      // Check if the document is in myFavorites
      await this.sqlite.getMyFavorites(undefined, doc.DocumentVersionFileID).then(async (favorites: any) => {
        if (favorites && favorites.length) {
          for (const docFav of favorites) {
            if (doc.DocumentVersionFileID === docFav.DocumentVersionFileID) {
              doc.DocumentFavorite = true;
              doc.DocumentFavoriteID = docFav.DocumentFavoriteID;
              doc.DownloadStatus = docFav.DownloadStatus;

              // Check if HASH has changed
              if (doc.DocumentVersionHash !== docFav.DocumentVersionHash) {
                doc.DownloadStatus = 'Waiting';
                // Removes old document
                await this.removeLocalFile(doc);
              }
            }
          }
        }
      });
      if (whereFrom === 'myFavorites') {
        doc.DocumentFavorite = true;
        doc.DocumentFavoriteID = doc.ID;
      }

      // Check if the document is in myDocument
      await this.sqlite.getMyDocuments(undefined, doc.DocumentVersionFileID).then(async (myDocs: any) => {
        if (myDocs && myDocs.length) {
          for (const myDoc of myDocs) {
            if (doc.DocumentVersionFileID === myDoc.DocumentVersionFileID) {
              doc.DownloadStatus = myDoc.DownloadStatus;

              // Check if HASH has changed
              if (doc.DocumentVersionHash !== myDoc.DocumentVersionHash) {
                doc.DownloadStatus = 'Waiting';
                // Removes old document
                await this.removeLocalFile(doc);
              }
            }
          }
        }
      });

      // Se for MyDocuments ou MyFavorites já deve estar na espera do download
      if (doc.DownloadStatus === '' && (whereFrom === 'myDocuments' || whereFrom === 'myFavorites')) {
        doc.DownloadStatus = 'Waiting';
      }

      // Document icon
      if (doc.DocumentVersionIcon) {
        doc.DocumentVersionIcon = 'data:image/png;base64,' + doc.DocumentVersionIcon;
      } else {
        doc.DocumentVersionIcon = 'assets/images/icon-pdf.svg';
      }

      // Document reference tag
      doc.DocumentTag = doc.DocumentCode ? doc.DocumentCode : '';
      if (doc.DocumentNumber) {
        doc.DocumentTag += doc.DocumentTag === '' ? doc.DocumentNumber : '.' + doc.DocumentNumber;
      }
      
      if (doc.DocumentReference) {
        doc.DocumentTag += doc.DocumentTag === '' ? doc.DocumentReference : ' - ' + doc.DocumentReference;
      }

      // Version
      doc.DocumentVersion = '';
      if (doc.DocumentTypeIsEditionControl) {
        doc.DocumentVersion = '(Ed.' + doc.DocumentVersionEdition + ' Rev.' + doc.DocumentVersionRevision;
        if (doc.DocumentVersionTemporaryReview > 0) {
          doc.DocumentVersion += ' TR.' + doc.DocumentVersionTemporaryReview + ' ' + doc.DocumentVersionTemporaryReviewDate + ')';
        } else {
          doc.DocumentVersion += ')';
        }
      }

      if (doc.DocumentTypeIsVersionControl) {
        doc.DocumentVersion = '(Ver.' + doc.DocumentVersionVersion;
        if (doc.DocumentVersionTemporaryReview > 0) {
          doc.DocumentVersion += ' TR.' + doc.DocumentVersionTemporaryReview + ' ' + doc.DocumentVersionTemporaryReviewDate + ')';
        } else {
          doc.DocumentVersion += ')';
        }
      }

      if (doc.DocumentTypeIsVersionAlphaControl) {
        doc.DocumentVersion = '(Ver.' + doc.DocumentVersionVersionAlpha + ')';
      }

      if (doc.DocumentTypeIsDateControl) {
        doc.DocumentExpirationDate = (doc.DocumentExpirationDate).split('T');
        doc.DocumentVersion = '(Valid until ' + doc.DocumentExpirationDate[0] + ')';
      }

      documentsTemp.push(doc);
    }
    console.log('>>>>>>>>>>>>> prepareDocumentsNew ENDED <<<<<<<<<<<<<', documentsTemp);
    return documentsTemp;
  }

  filterDocumentLastVersion(docs: any) {
    return docs.filter((doc) => {
      return doc.DocumentVersionIsLastVersion;
    });
  }

  async addFavorite(doc: any, user: any, subscription: any, onComplete?: () => void): Promise<void> {
    const loading = await this.createLoading();
    loading.present();

    const id = Guid.create().toString();
    const timeNow = new Date();
    const obj = {
      ID: id,
      UserID: user.ID,
      DocumentID: doc.DocumentID,
      DocumentVersionID: doc.DocumentVersionID,
      Status: true,
      Date: timeNow.toJSON(),
      Comments: 'Added from APP'
    };

    this.apiService.postFavoriteDocument(subscription.OdataUser, subscription.OdataPassword, obj)
    .then(async (response) => {
      console.log('postFavoriteDocument', response);
      this.applyFavorite(doc, true, id, onComplete);
      loading.dismiss();
    })
    .catch(() => {
      loading.dismiss();
      this.applyFavorite(doc, true, id, onComplete);
    });
  }

  async removeFavorite(doc: any, subscription: any, onComplete?: () => void): Promise<void> {
    const loading = await this.createLoading();
    loading.present();

    this.apiService.deleteFavoriteDocument(subscription.OdataUser, subscription.OdataPassword, doc.DocumentFavoriteID)
    .then(async (response) => {
      console.log('deleteFavoriteDocument', response);
      this.applyFavorite(doc, true, null, onComplete);
      loading.dismiss();
    })
    .catch(() => {
      loading.dismiss();
      this.applyFavorite(doc, true, null, onComplete);
    });
  }

  backgroundUpdateLibrary() {
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateLibrary BEGAN ~~~~~~~~~~~~~~~~');
    const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
    let documents = null;
    
    this.apiService.getDocuments(subscription.OdataUser, subscription.OdataPassword).then(async (response) => {
      const result: any = response;

      if (JSON.parse(result.data).value.length !== 0) {
        await this.prepareDocumentsNew(JSON.parse(result.data).value, 'library').then((response2) => {
          if (response2 && response2.length) {
            documents = response2;
            // Filter by the last version
            documents = this.filterDocumentLastVersion(documents);
          } else {
            documents = null;
          }
        });
      }
      // Save in localStorage
      this.sqlite.updateLibraryList(documents).then(response2 => this.events.publish('updateLibrary', documents));
    })
    .catch(async (error) => {
      console.log(error);
      this.events.publish('updateLibrary', null);
    });
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateLibrary ENDED ~~~~~~~~~~~~~~~~');
  }

  backgroundUpdateMyDocuments() {
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateMyDocuments BEGAN ~~~~~~~~~~~~~~~~');
    const subscriptionRaw = localStorage.getItem('onwi.Subscription');
    const userRaw = localStorage.getItem('onwi.User');

    if (!subscriptionRaw || !userRaw) {
      console.warn('backgroundUpdateMyDocuments aborted: missing subscription or user', subscriptionRaw, userRaw);
      return;
    }

    const subscription = JSON.parse(subscriptionRaw);
    const user = JSON.parse(userRaw);
    let documents = null;

    this.apiService.getDistributedDocuments(subscription.OdataUser, subscription.OdataPassword, user.ID)
    .then(async (response) => {
      const result: any = response;
      // console.log('backgroundUpdateMyDocuments getDistributedDocuments', JSON.parse(result.data).value);
      if (JSON.parse(result.data).value.length !== 0) {
        await this.prepareDocumentsNew(JSON.parse(result.data).value, 'myDocuments').then((response2) => {
          if (response2 && response2.length) {
            documents = response2;
          } else {
            documents = null;
          }
        });
      }

      // Save in localStorage
      this.sqlite.updateMyDocumentsList(documents).then(response2 => this.events.publish('updateMyDocuments', documents));
    })
    .catch(async (error) => {
      console.log(error);
      this.events.publish('updateLibrary', null);
    });
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateMyDocuments END ~~~~~~~~~~~~~~~~');
  }

  async backgroundUpdateFavorites() {
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateFavorites BEGAN ~~~~~~~~~~~~~~~~');
    const subscriptionRaw = localStorage.getItem('onwi.Subscription');
    const userRaw = localStorage.getItem('onwi.User');

    if (!subscriptionRaw || !userRaw) {
      console.warn('backgroundUpdateFavorites aborted: missing subscription or user', subscriptionRaw, userRaw);
      return;
    }

    const subscription = JSON.parse(subscriptionRaw);
    const user = JSON.parse(userRaw);

    try {
      const response = await this.apiService.getFavoritesDocuments(subscription.OdataUser, subscription.OdataPassword, user.ID);

      const result = response?.value ?? [];
      let documents = [];

      if (result.length) {
        const prepared = await this.prepareDocumentsNew(result, 'myFavorites');
        documents = prepared?.length ? prepared : [];
      }

      await this.sqlite.updateMyFavoritesList(documents);
      this.events.publish('updateMyFavorites', documents);
    } catch(error) {
      console.log(error);
      this.events.publish('updateLibrary', null);
    }
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateFavorites END ~~~~~~~~~~~~~~~~');
  }

  // TODO:
  backgroundUpdateLastDocsDistributed() {
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateLastDocsDistributed BEGAN ~~~~~~~~~~~~~~~~');
    const subscriptionRaw = localStorage.getItem('onwi.Subscription');
    const userRaw = localStorage.getItem('onwi.User');

    if (!subscriptionRaw || !userRaw) {
      console.warn('backgroundUpdateLastDocsDistributed aborted: missing subscription or user', subscriptionRaw, userRaw);
      return;
    }

    const subscription = JSON.parse(subscriptionRaw);
    const user = JSON.parse(userRaw);
    let documents = null;
    this.apiService.getToApproveDocuments(subscription.OdataUser, subscription.OdataPassword, user.ID)
    .then(async (response) => {
      const result: any = response;
      // console.log(JSON.parse(result.data).value);
      // this.localNotifications.clear(9999);
      if (JSON.parse(result.data).value.length !== 0) {
        await this.prepareDocumentsNew(JSON.parse(result.data).value, 'lastDocsDistributed').then((response2) => {
          if (response2 && response2.length) {
            documents = response2;
            // this.localNotifications.schedule({
            //   id: 9999,
            //   title: 'Documents to approve',
            //   text: 'Check the Last Docs Distribuited to approve your documents. You have ' + response2.length + ' pending document(s).',
            //   badge: response2.length,
            //   priority: 1
            // });
          } else {
            documents = null;
          }
          // console.log('getToApproveDocuments success', documents);
        });
      }
      // Save in localStorage
      this.sqlite.updateLastDocsDistributedList(documents).then(response2 => this.events.publish('updateLastDocs', documents));
    })
    .catch(async (error) => {
      console.log(error);
      this.events.publish('updateLibrary', null);
    });
    console.log('~~~~~~~~~~~~~~~~ backgroundUpdateLastDocsDistributed END ~~~~~~~~~~~~~~~~');
  }

  async getPermissionsOffline() {
    console.log('~~~~~~~~~~~~~~~~ getPermissionsOffline BEGAN ~~~~~~~~~~~~~~~~');
    const userRaw = localStorage.getItem('onwi.User');
    const subscriptionRaw = localStorage.getItem('onwi.Subscription');

    if (!userRaw || !subscriptionRaw) {
      console.log('getPermissionsOffline - missing user or subscription');
      return;
    }

    const user = JSON.parse(userRaw);
    const subscription = JSON.parse(subscriptionRaw);

    try {
      const response = await this.apiService.getPermissionsDocuments(subscription.OdataUser, subscription.OdataPassword, user.ID);

      console.log('getPermissionsOffline - response', JSON.stringify(response));

      const permissions = response?.value ?? [];
      await this.sqlite.updatePermissionsList(permissions);
    } catch (error) {
      console.log('getPermissionsOffline - error', error);
    }

    console.log('~~~~~~~~~~~~~~~~ getPermissionsOffline ENDED ~~~~~~~~~~~~~~~~');
  }

  async getPermissionDocument(OdataUser: string, OdataPassword: string, userID: string, DocumentID: string) {
    try {
      // Check SQLite first
      const cached = await this.sqlite.getPermission(DocumentID);
      console.log('getPermission SQLite result:', JSON.stringify(cached, null, 2));

      if (cached.length) {
        return cached[0].canDownload ? cached[0] : 'denied';
      }

      // Use the API
      const response = await this.apiService.getPermissionDocument(OdataUser, OdataPassword, userID, DocumentID);
      console.log('getPermission API result:', JSON.stringify(response, null, 2));

      if (!response?.value.length) {
        return 'denied';
      }

      return response.value[0].canDownload ? response[0] : 'denied';
    } catch (error) {
      console.log('getPermissionDocument error', error);
      return false;
    }
  }

  async openFile(doc: any, user: any, subscription: any, onDownloadSuccess?: () => void): Promise<void> {
    let loading = await this.createLoading();
    await loading.present();

    console.log("PRINTING THE DOCUMENT")
    console.log("DOCUMENT: ", JSON.stringify(doc, null, 2));
    console.log("END PRINTING THE DOCUMENT")

    // Check permissions
    const permissionResult = await this.getPermissionDocument(
      subscription.OdataUser, subscription.OdataPassword, 
      user.ID, doc.DocumentID
    );

    console.log('PERMISSION RESULT:', JSON.stringify(permissionResult, null, 2));

    if (!permissionResult || permissionResult === 'denied') {
      if (permissionResult === 'denied') {
        doc.DownloadStatus = '';
        await this.sqlite.updateDownloadStatus(doc.DocumentID, '');
      }

      await loading.dismiss();
      const alert = await this.createAlert('Access denied', 'You don\'t have permissions to open this document.');
      await alert.present();
      return;
    }

    // Type 1 opens in browser
    if (doc.DocumentType === 'Type 1') {
      await loading.dismiss();
      await this.openDocumentType1(doc, user.ID);
      return;
    }

    // Download if needed
    if (doc.DownloadStatus !== 'Downloaded') {
      const response = await this.downloadLocalFile(doc, loading);

      if (response?.loader) {
        loading = response.loader;
      }

      if (!response?.status) {
        await loading.dismiss();
        const alert = await this.createAlert('Something went wrong', response.message);
        await alert.present();
        return;
      }

      doc.DownloadStatus = 'Downloaded';
      onDownloadSuccess?.();
      this.apiService.logDocumentOpen(doc, user.ID);
    }

    try {
      const directory = this.platform.is('ios') ? Directory.Documents : Directory.Data;
      const { uri } = await Filesystem.getUri({ path: doc.DocumentVersionFileName, directory });
      const mimeFile = this.mimeFileConvert(doc.DocumentVersionExtension);

      await FileOpener.open({ filePath: uri, contentType: mimeFile });
      await loading.dismiss();
    } catch (error: any) {
      await loading.dismiss();

      if (error?.message === 'File does not exist') {
        doc.DownloadStatus = 'Waiting';
        await this.sqlite.updateDownloadStatus(doc.DocumentID, 'Waiting');
        return this.openFile(doc, user, subscription, onDownloadSuccess); // retry to open the file (download and open)
      }

      const message = error?.status === 9 ? `No app found to read ${doc.DocumentVersionExtension} file` : 'Error on open file';
      const alert = await this.createAlert('Something went wrong', message);
      await alert.present();
    }
  }

  async openDocumentType1(doc: any, userID: string) {
    // doc.DocumentURLUser, doc.DocumentURLPassword
    // 'location=yes,closebuttoncolor=#FFFFFF,toolbar=yes,toolbarcolor=#0097A8'
    // const browser = this.iab.create(doc.url, '_system');
    window.open(doc.url, '_blank');
    await this.apiService.logDocumentOpen(doc, userID);
  }

  async removeLocalFile(doc: any): Promise<any> {
    try {
      const directory = this.platform.is('ios') ? Directory.Documents : Directory.Data;

      await Filesystem.deleteFile({ path: doc.DocumentVersionFileName, directory });

      console.log('removeLocalFile success', doc.DocumentVersionFileName);
      return { success: true };
    } catch (error) {
      console.log('removeLocalFile error', error?.message);
      return false;
    }
  }

  async downloadLocalFile(doc: any, loader?: any): Promise<any> {
    console.log('downloadLocalFile', JSON.stringify(doc));

    let loading = loader ?? null;

    try {
      const subscriptionRaw = localStorage.getItem('onwi.Subscription');
      if (!subscriptionRaw) {
        return { status: false, message: 'Invalid Subscription.', loader: loading };
      }

      const userRaw = localStorage.getItem('onwi.User');
      if (!userRaw) {
        return { status: false, message: 'Invalid user.', loader: loading };
      }

      const networkStatus = localStorage.getItem('onwi.networkStatus');
      if (networkStatus === 'offline') {
        return { status: false, message: 'Connect on wifi or mobile network to download this file.', loader: loading };
      }

      const subscription = JSON.parse(subscriptionRaw);
      const user = JSON.parse(userRaw);

      // Check permissions
      const permissionResult = await this.getPermissionDocument(
        subscription.OdataUser,
        subscription.OdataPassword,
        user.ID,
        doc.DocumentID
      );

      if (!permissionResult) {
        return { status: false, message: 'Permission not found. Wait a moment and try again.', loader: loading };
      }

      if (permissionResult === 'denied') {
        await this.sqlite.updateDownloadStatus(doc.DocumentID, '');
        return { status: false, message: 'You have no permission to download this file.', loader: loading };
      }

      // Check network type
      let allowDownload = false;

      if (networkStatus === 'wifi') {
        allowDownload = true;
      } else if (networkStatus !== 'offline') {
        // Mobile data — ask user
        if (loader) {
          try { await loader.dismiss(); } catch {}
        }

        allowDownload = await this.validateDownloadNetwork();

        if (loader) {
          loading = await this.createLoading();
          await loading.present();
        }
      }

      console.log('downloadLocalFile - allowDownload', allowDownload, JSON.stringify(doc));

      if (!allowDownload) {
        return { status: false, message: 'Connect on wifi network to download this file.', loader: loading };
      }

      // Download the file
      const directory = this.platform.is('ios') ? Directory.Documents : Directory.Data;
      const { uri } = await Filesystem.getUri({ path: doc.DocumentVersionFileName, directory });

      // Strategy 1: getFile() returns base64 binary
      try {
        const response: any = await this.apiService.getFile(
          subscription.OdataUser,
          subscription.OdataPassword,
          doc.DocumentVersionFileID
        );

        const binary = response?.Binary ?? (response?.data ? JSON.parse(response.data)?.Binary : null);

        if (binary) {
          console.log('downloadLocalFile - getFile - createFile', uri, doc.DocumentVersionFileName);

          await Filesystem.writeFile({
            path: doc.DocumentVersionFileName,
            data: binary,
            directory,
            recursive: true
          });
          await this.sqlite.updateDownloadStatus(doc.DocumentID, 'Downloaded');

          console.log('downloadLocalFile - successfully wrote binary file');

          return { status: true, message: uri, loader: loading };
        }

        // No binary in response — fall through to strategy 2
        console.log('downloadLocalFile - no binary in getFile response, trying downloadFile');
      } catch (error) {
        console.log('downloadLocalFile - getFile failed, trying downloadFile fallback', error);
      }

      // Strategy 2: downloadFile() (direct file download)
      try {
        await this.apiService.downloadFile(
          subscription.OdataUser,
          subscription.OdataPassword,
          user.ID,
          doc.DocumentID,
          doc.DocumentVersionID,
          uri
        );

        await this.sqlite.updateDownloadStatus(doc.DocumentID, 'Downloaded');

        console.log('downloadLocalFile - downloadFile success');
        return { status: true, message: uri, loader: loading };
      } catch (error) {
        console.log('downloadLocalFile - downloadFile error', error);
        return { status: false, message: 'Could not get file information. Wait a moment and try again.', loader: loading };
      }
    } catch (error) {
      console.log('downloadLocalFile fatal error', error);
      return { status: false, message: 'Could not get file information. Wait a moment and try again.', loader: loading };
    }
  }

  async validateDownloadNetwork(): Promise<boolean> {
    // console.log('validateDownloadNetwork');
    return new Promise<boolean>(async (resolve) => {
      const alert = await this.alertController.create({
        cssClass: 'alertAlphacode',
        header: 'You are not on WiFi connection',
        message: 'Do you want to download the file using mobile data?',
        buttons: [{
          text: 'Cancel',
          handler: () => resolve(false)
        }, {
          text: 'Yes',
          handler: () => resolve(true)
        }]
      });
      await alert.present();
    });
  }

  getNextDownload() {
    const connection = localStorage.getItem('onwi.networkStatus');
    // console.log('buscarProximoDownload conexão', conexao);
    if (connection === 'offline') {
      setTimeout(() => {
        this.getNextDownload();
      }, 60000); // Roda de novo 1 minuto depois
    } else {
      // Função para buscar no banco de dados próximo arquivo a ser baixado e atualizar tabelas com status do download
      this.sqlite.getNextDownload().then((document: any) => {
        console.log('getNextDownload - Next file to be downloaded: ', JSON.stringify(document));
        if (document.status) {
          // Baixa documento
          if (connection === 'wifi') {
            this.downloadLocalFile(document.document).then((response: any) => {
              console.log('getNextDownload - downloadLocalFile ', response, document);
              if (response.status) {
                // Atualiza banco de dados
                // this.sqlite.atualizarDownloadStatus(document.tabela, document.document.id, 'Downloaded').then((response2: any) => {
                //   console.log('buscarProximoDownload - Tabela atualizada', response2);
                // });
                this.sqlite.updateDownloadStatus(document.document.DocumentID, 'Downloaded');
                console.log('getNextDownload - Success, file downloaded :)', response, document);
              } else {
                if (response.message === 'You have no permission to download this file.') {
                  // Coloco o status como vazio para não travar fila de downloads
                  this.sqlite.updateDownloadStatus(document.document.DocumentID, '');
                }
              }
              setTimeout(() => {
                this.getNextDownload();
              }, 60000); // Roda de novo 1 minuto depois
            }).catch((error) => {
              // console.log('buscarProximoDownload error', error);
              setTimeout(() => {
                this.getNextDownload();
              }, 60000); // Roda de novo 1 minuto depois
            });
          } else {
            this.validateDownloadNetwork().then((baixar: any) => {
              if (baixar) {
                this.downloadLocalFile(document.document).then((response: any) => {
                  if (response.status) {
                    // Update the data base
                    this.sqlite.updateDownloadStatus(document.document.DocumentID, 'Downloaded');
                  }
                }).catch((error) => {
                  // console.log('buscarProximoDownload error', error);
                  setTimeout(() => {
                    this.getNextDownload();
                  }, 60000); // Roda de novo 1 minuto depois
                });
              } else {
                setTimeout(() => {
                  this.getNextDownload();
                }, 60000); // Roda de novo 1 minuto depois
              }
            }).catch((error) => {
              setTimeout(() => {
                this.getNextDownload();
              }, 60000); // Roda de novo 1 minuto depois
            });
          }
        } else {
          setTimeout(() => {
            this.getNextDownload();
          }, 60000); // Roda de novo 1 minuto depois
        }
      }).catch((error) => {
        // console.log('buscarProximoDownload error', error);
        setTimeout(() => {
          this.getNextDownload();
        }, 60000); // Roda de novo 1 minuto depois
      });
    }
  }

  mimeFileConvert(extension: string) {
    if (extension) {
      extension = extension.toLowerCase();
      switch (extension) {
        case 'xlsx':
          return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'xls':
          return 'application/vnd.ms-excel';
        case 'pptx':
          return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        case 'ppt':
          return 'application/vnd.ms-powerpoint';
        case 'docx':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'doc':
          return 'application/msword';
        case 'pdf':
          return 'application/pdf';
        case 'rtf':
          return 'application/rtf';
        case 'rar':
          return 'application/x-rar-compressed';
        default:
          return '';
      }
    } else {
      return '';
    }
  }

  limpaDownloads() {
    // TO-DO - REFAZER PARA BANCO DE DADOS
    const downloads: any = JSON.parse(localStorage.getItem('onwi.Downloads'));
    // const myDocuments: any = JSON.parse(localStorage.getItem('onwi.Documents'));
    // const favorites: any = JSON.parse(localStorage.getItem('onwi.Favorites'));
    let documents: any = [];

    // Se tem downloads, verifico
    if (downloads) {
      // if (myDocuments) {
      //   // Se tem myDocuments, encremento
      //   documents = documents.concat(myDocuments);
      // }
      // if (favorites) {
      //   // Se tem favorites, encremento
      //   documents = documents.concat(favorites);
      // }

      // Se tem MyDocuments e Favorites no storage, é só uma limpeza
      if (documents && documents.length) {
        // Verifico item a item de downloads
        downloads.forEach((docFila: any, indexFila: number) => {
          let removerDocumento = true;
          // Se existe em MyDocuments ou Favorites
          documents.forEach((newDoc: any) => {
            if (docFila.DocumentID === newDoc.DocumentID) {
              // Se existir, verifico se o HASH ainda é igual
              if (docFila.DocumentVersionHash === docFila.DocumentVersionHash) {
                // Deve continuar nos downloads
                removerDocumento = false;
              }
            }
          });
          // Verifico se devo remover
          if (removerDocumento) {
            this.removeLocalFile(docFila).then((response) => {
              downloads.splice(indexFila, 1);
              // Atualizo localStorage
              // localStorage.setItem('onwi.Downloads', JSON.stringify(downloads));
            });
          }
        });
      } else {
        // Se não tem nada em myDocuments e favorites, limpo a fila inteira
        downloads.forEach((docFila: any, indexFila: number) => {
          this.removeLocalFile(docFila).then((response) => {
            downloads.splice(indexFila, 1);
            // Atualizo localStorage
            // localStorage.setItem('onwi.Downloads', JSON.stringify(downloads));
          });
        });
      }
    }
  }

  cleanStorage(source: string) {
    // localStorage.removeItem('onwi.SoftwareID');
    if (source === 'externo') {
      localStorage.removeItem('onwi.SubscriptionID');
      localStorage.removeItem('onwi.Subscription');
    }
    localStorage.removeItem('onwi.Login');
    localStorage.removeItem('onwi.UserID');
    localStorage.removeItem('onwi.User');
    localStorage.removeItem('onwi.Folders');
    localStorage.removeItem('onwi.PermissionsOffline');
    localStorage.removeItem('onwi.DocumentLog');
    localStorage.removeItem('onwi.Library');
    localStorage.removeItem('onwi.Documents');
    localStorage.removeItem('onwi.Favorites');
    localStorage.removeItem('onwi.LastDocs');
    // this.localNotifications.clearAll();
    // Depois de limpar localStorage, removo todos os downloads
    this.limpaDownloads();
  }

  async exitApp(source: string, ask?: boolean) {
    // console.log('exitApp');
    if (ask) {
      const alert = await this.alertController.create({
        cssClass: 'alertAlphacode',
        header: 'Are you sure?',
        message: 'Do you want to logout?',
        buttons: [{
          text: 'Cancel',
          role: 'cancel'
        }, {
          text: 'Yes',
          handler: () => {
            // Limpa localStorage
            this.cleanStorage(source);
            this.sqlite.clearAllRecords();
            // Limpa histórico de navegação e redireciona para Login
            if (source === 'interno') {
              this.navCtrl.navigateRoot('/login');
            } else {
              this.navCtrl.navigateRoot('/subscription');
            }
          }
        }]
      });
      alert.present();
    } else {
      // Limpa localStorage
      this.cleanStorage(source);
      this.sqlite.clearAllRecords();
      // Limpa histórico de navegação e redireciona para Login
      if (source === 'interno') {
        this.navCtrl.navigateRoot('/login');
      } else {
        this.navCtrl.navigateRoot('/subscription');
      }
    }
  }

  private async publishFolders(): Promise<void> {
    const menuFolders = await this.prepareMenuFolders(null);
    this.events.publish('updateFolders', menuFolders);
  }

  private applyFavorite(doc: any, status: boolean, id: string, onComplete?: () => void) {
    doc.DocumentFavorite = status;
    doc.DocumentFavoriteID = id;
    this.sqlite.updateFavoriteDocs(doc.DocumentVerionID, doc.DocumentFavoriteID, doc.DocumentFavorite, doc);
    onComplete?.();
  }
}
