import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FileTransfer } from '@capacitor/file-transfer';
import { timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Guid } from 'guid-typescript';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private _http: HttpClient,
    // private http: HTTP
  ) {}

  private getBasicOptions(username: string, userPassword: any, acceptJson: boolean = true) {
    const headers: any = {
      Authorization: 'Basic ' + btoa(username + ':' + userPassword)
    };

    if (acceptJson) {
      headers.Accept = 'application/json';
    }

    return {
      headers: new HttpHeaders(headers)
    };
  }

  validateSubscription(subscriptionID: any) {
    const authorization = btoa('onwidemo:onwi.demo2007');
    const url = 'https://license.slapps.pt/odata/APIGetLicense?$filter=SubscriptionID eq ' + subscriptionID + ' and SoftwareID eq 0ca63508-6768-4d93-9aa8-f4cbe72b9256';
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: 'Basic ' + authorization,
        Accept: 'application/json'
        // Authorization: 'Basic b253aWRlbW86b253aS5kZW1vMjAwNw=='
      })
    };
    return this._http.get(url, httpOptions).toPromise();
  }

  encryptPass(password: any) {
    const url = 'https://api.onwi-app.com/conversor.php?string=' + encodeURIComponent(password);
    console.log('encryptPass url', url);
    return this._http.get(url).toPromise();
    // return this.http.get(url).toPromise();
  }

  validateUser(username: string, userPassword: string, email: string, password: string) {
    const subscription = this.getSubscription();

    const url = encodeURI(subscription.OdataEndPoint + 'WEBUser?$filter=Email eq \'' + email + '\' and Password eq \'' + password + '\'');
    console.log('validateUser url', url);
  
    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  requestPasswordReset(data: object): Promise<any> {
    const url = encodeURI('http://192.168.1.72/api/Password/RequestReset');
    console.log('requestPasswordReset url', url);

    return firstValueFrom(this._http.post(url, data));
  }

  // Get the folders by alphabetic order
  async getDocumentsFolders(username: string, userPassword: string): Promise<any> {
    const subscription = this.getSubscription();
    
    const url = encodeURI(subscription.OdataEndPoint + 'WEBDocumentsFolders?$orderby=Name asc');
    console.log('getDocumentsFolders url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  getDocuments(username: string, userPassword: string): Promise<any> {
    const subscription = this.getSubscription();

    const url = encodeURI(subscription.OdataEndPoint + 'WEBDocuments');
    console.log('getDocuments url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  getDistributedDocuments(username: string, userPassword: string, userID: string): Promise<any> {
    const subscription = this.getSubscription();
    
    const url = encodeURI(`${subscription.OdataEndPoint}WEBDocumentsDistribution?$filter=(isReceived eq true and wasUnderstood eq true) and UserID eq ${userID}`);
    console.log('getDistributedDocuments url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  async getFavoritesDocuments(username: string, userPassword: string, userID: string): Promise<any[]> {
    const subscription = this.getSubscription();

    // Get the favorite documents of the user
    const urlF = encodeURI(`${subscription.OdataEndPoint}WEBDocumentsFavorites?$filter=UserID eq ${userID} and DocumentStatusIsActive eq true`);
    console.log('getFavoritesDocuments url', urlF);

    const favRes: any = await firstValueFrom(this._http.get(urlF, this.getBasicOptions(username, userPassword)));

    const urlD = encodeURI(`${subscription.OdataEndPoint}WEBDocumentsDistribution?$filter=UserID eq ${userID}`);
    console.log('getDistributedDocuments url', urlD);
    const distRes: any = await firstValueFrom(this._http.get(urlD, this.getBasicOptions(username, userPassword)));

    const favDocs = favRes?.value ?? favRes ?? [];
    const distDocs = distRes?.value ?? distRes ?? [];

    const distMap = new Map(
      distDocs.map((doc: any) => [doc.DocumentID, doc])
    );

    return favDocs.map((doc: any) => {
      const dist: any = distMap.get(doc.DocumentID);
      
      return {
        ...doc,
        isReceived: dist?.isReceived ?? false,
        wasUnderstood: dist?.wasUnderstood ?? false
      };
    });
  }

  async postDocumentLog(username: string, userPassword: string, data: object): Promise<any> {
    const subscription = this.getSubscription();

    const url = `${subscription.OdataEndPoint}DocumentLogs`;
    console.log('postDocumentLog', data);

    return firstValueFrom(this._http.post(url, data, this.getBasicOptions(username, userPassword)));
  }

  postFavoriteDocument(username: string, userPassword: string, data: object): Promise<any> {
    const subscription = this.getSubscription();

    const url = `${subscription.OdataEndPoint}UserDocumentsFavorite`;
    console.log('postFavoriteDocument url', url);

    return firstValueFrom(this._http.post(url, data, this.getBasicOptions(username, userPassword)));
  }

  deleteFavoriteDocument(username: string, userPassword: string, documentID: string): Promise<any> {
    const subscription = this.getSubscription();

    const url = `${subscription.OdataEndPoint}UserDocumentsFavorite(${documentID})`;
    console.log('postFavoriteDocument url', url);

    return firstValueFrom(this._http.request('DELETE', url, this.getBasicOptions(username, userPassword, false)));
  }

  getToApproveDocuments(username: string, userPassword: string, userID: string): Promise<any> {
    const subscription = this.getSubscription();

    const url = encodeURI(subscription.OdataEndPoint + 'WEBDocumentsDistribution?$filter=(isReceived eq false or wasUnderstood eq false) and UserID eq ' + userID);
    console.log('getToApproveDocuments url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  postToApproveDocuments(username: string, userPassword: string, distributionID: string, data: object): Promise<any> {
    const subscription = this.getSubscription();

    const url = `${subscription.OdataEndPoint}DocumentDistribution(${distributionID})`;
    console.log('postToApproveDocuments url', url);

    return firstValueFrom(this._http.patch(url, data, this.getBasicOptions(username, userPassword, false)));
  }

  async getPermissionsDocuments(username: string, userPassword: any, userID: any): Promise<any> {
    const subscription = this.getSubscription();

    const url = encodeURI(subscription.OdataEndPoint + 'WEBDocumentsPermissions?$filter=UserID eq ' + userID + ' and canDownload eq true');
    console.log('getPermissionsDocuments url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  async getPermissionDocument(username: string, userPassword: string, userID: string, documentID: any): Promise<any> {
    const subscription = this.getSubscription();

    const url = encodeURI(`${subscription.OdataEndPoint}WEBDocumentsPermissions?$filter=UserID eq ${userID} and canDownload eq true and DocumentID eq ${documentID}`);
    console.log('getPermissionDocument url', url);

    return firstValueFrom(this._http.get(url, this.getBasicOptions(username, userPassword)));
  }

  async getFile(username: string, userPassword: any, DocumentVersionFileID: any): Promise<any> {
    const subscription = this.getSubscription();

    const url = encodeURI(subscription.OdataEndPoint + 'Files(' + DocumentVersionFileID + ')?$select=Binary');
    console.log('getFile url', url);

    return firstValueFrom(
      this._http.get(url, this.getBasicOptions(username, userPassword)).pipe(timeout(60000))
    );
  }

  // getUrlFile(username: string, userPassword: any, userID: any, documentID: any, DocumentVersionID: any) {
  //   const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
  //   const url = encodeURI(`${subscription.EndPoint2}?UserID=${userID}&DocumentID=${documentID}&DocumentVersionID=${DocumentVersionID}`);
  //   this.http.useBasicAuth(username, userPassword);
  //   return this.http.get(url, {}, {});
  // }

  async downloadFile(username: string, userPassword: any, userID: any, documentID: any, DocumentVersionID: any, uri: string): Promise<void> {
    const subscription = this.getSubscription();

    const url = encodeURI(`${subscription.EndPoint2}?UserID=${userID}&DocumentID=${documentID}&DocumentVersionID=${DocumentVersionID}`);
    console.log('downloadFile url', url);

    await FileTransfer.downloadFile({
      url,
      path: uri,
      headers: {
        Authorization: 'Basic ' + btoa(username + ':' + userPassword)
      }
    });
  }

  async logDocumentOpen(doc: any, userID: string) {
    const subscription = this.getSubscription();
    
    const obj = {
      ID: Guid.create().toString(),
      DocumentID: doc.DocumentID,
      DocumentVersionID: doc.DocumentVersionID,
      ProviderID: null,
      UserID: userID,
      Date: new Date().toJSON(),
      Action: 'Download Document',
      ActionFrom: 'MOBILE',
      Downloaded: true,
      Viewed: true
    };

    // TODO: maybe could be private
    await this.postDocumentLog(subscription.OdataUser, subscription.OdataPassword, obj)
    .catch(() => {
      const existing = localStorage.getItem('onwi.DocumentLog');
      const log = existing && existing !== '' ? JSON.parse(existing) : [];
      log.push(obj);
      localStorage.setItem('onwi.DocumentLog', JSON.stringify(log));
    });
  }

  private getSubscription() {
    const raw = localStorage.getItem('onwi.Subscription');

    if (!raw) {
      throw new Error('No subscription found');
    }

    return JSON.parse(raw);
  }
}
