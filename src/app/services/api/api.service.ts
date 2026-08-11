import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FileTransfer } from '@capacitor/file-transfer';
import { timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Guid } from 'guid-typescript';
import { SecureStorageService } from '../secure-storage/secure-storage.service';
import { environment } from 'src/environments/environment';

// TODO: Most important part, the API ate the login should generate a token for each user and pass that token in each request!
//       Then, if the token was still valid, the backend (API), would have the credentials and return/patch/post the data.
//       This would mean that the app would stop storing the OdataUser and OdataPassword for better security!
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    private _http: HttpClient,
    private secureStorageService: SecureStorageService
    // private http: HTTP
  ) {}

  private async getBasicOptions(acceptJson: boolean = true, returnRepresentation: boolean = false): Promise<{ headers: HttpHeaders }> {
    const credentials = await this.secureStorageService.getOdataCredentials();

    const headers: any = {
      Authorization: 'Basic ' + btoa(credentials.username + ':' + credentials.password)
    };

    if (acceptJson) {
      headers.Accept = 'application/json';
    }

    if (returnRepresentation) {
      headers.Prefer = 'return=representation'
    }

    return {
      headers: new HttpHeaders(headers)
    };
  }

  encryptPass(password: any) {
    const url = 'https://api.onwi-app.com/conversor.php?string=' + encodeURIComponent(password);
    console.log('encryptPass url', url);
    return this._http.get(url).toPromise();
    // return this.http.get(url).toPromise();
  }

  async validateUser(email: string, password: string) {
    const url = encodeURI(environment.OdataEndpoint + 'WEBUser?$filter=Email eq \'' + email + '\' and Password eq \'' + password + '\'');
    console.log('validateUser url', url);
  
    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  requestPasswordReset(data: object): Promise<any> {
    const url = encodeURI('http://192.168.1.72/api/Password/RequestReset');
    console.log('requestPasswordReset url', url);

    return firstValueFrom(this._http.post(url, data));
  }

  // Get the folders by alphabetic order
  async getDocumentsFolders(): Promise<any> {
    const url = encodeURI(environment.OdataEndpoint + 'WEBDocumentsFolders?$orderby=Name asc');
    console.log('getDocumentsFolders url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async getDocuments(): Promise<any> {
    const url = encodeURI(environment.OdataEndpoint + 'WEBDocuments');
    console.log('getDocuments url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async getDistributedDocuments(userID: string): Promise<any> {    
    const url = encodeURI(`${environment.OdataEndpoint}WEBDocumentsDistribution?$filter=isReceived eq true and wasUnderstood eq true and UserID eq ${userID}`);
    console.log('getDistributedDocuments url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async getFavoritesDocuments(userID: string): Promise<any> {
    const urlF = encodeURI(`${environment.OdataEndpoint}WEBDocumentsFavorites?$filter=UserID eq ${userID} and DocumentStatusIsActive eq true`);
    console.log('getFavoritesDocuments url', urlF);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(urlF, options));
  }

  async postDocumentLog(data: object): Promise<any> {
    const url = `${environment.OdataEndpoint}DocumentLogs`;
    console.log('postDocumentLog', data);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.post(url, data, options));
  }

  async postFavoriteDocument(data: object): Promise<any> {
    const url = `${environment.OdataEndpoint}UserDocumentsFavorite`;
    console.log('postFavoriteDocument url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.post(url, data, options));
  }

  async updateFavoriteDocument(documentFavoriteID: string, data: object): Promise<any> {
    const url = `${environment.OdataEndpoint}UserDocumentsFavorite(${documentFavoriteID})`;
    console.log('updateFavoriteDocument url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.patch(url, data, options));
  }

  async deleteFavoriteDocument(documentID: string): Promise<any> {
    const url = `${environment.OdataEndpoint}UserDocumentsFavorite(${documentID})`;
    console.log('postFavoriteDocument url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.request('DELETE', url, options));
  }

  async getToApproveDocuments(userID: string): Promise<any> {
    const url = encodeURI(environment.OdataEndpoint + 'WEBDocumentsDistribution?$filter=(isReceived eq false or wasUnderstood eq false) and UserID eq ' + userID);
    console.log('getToApproveDocuments url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async postToApproveDocuments(distributionID: string, data: object): Promise<any> {
    const url = `${environment.OdataEndpoint}DocumentDistribution(${distributionID})`;
    console.log('postToApproveDocuments url', url);

    const options = await this.getBasicOptions();
    options.headers = options.headers.set('Prefer', 'return=representation');
    return firstValueFrom(this._http.patch(url, data, options));
  }

  async getPermissionsDocuments(userID: any): Promise<any> {
    const url = encodeURI(environment.OdataEndpoint + 'WEBDocumentsPermissions?$filter=UserID eq ' + userID + ' and canDownload eq true');
    console.log('getPermissionsDocuments url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async getPermissionDocument(userID: string, documentID: any): Promise<any> {
    const url = encodeURI(`${environment.OdataEndpoint}WEBDocumentsPermissions?$filter=UserID eq ${userID} and canDownload eq true and DocumentID eq ${documentID}`);
    console.log('getPermissionDocument url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options));
  }

  async getFile(DocumentVersionFileID: any): Promise<any> {
    const url = encodeURI(environment.OdataEndpoint + 'Files(' + DocumentVersionFileID + ')?$select=Binary');
    console.log('getFile url', url);

    const options = await this.getBasicOptions();
    return firstValueFrom(this._http.get(url, options).pipe(timeout(60000)));
  }

  // getUrlFile(username: string, userPassword: any, userID: any, documentID: any, DocumentVersionID: any) {
  //   const subscription = JSON.parse(localStorage.getItem('onwi.Subscription'));
  //   const url = encodeURI(`${subscription.EndPoint2}?UserID=${userID}&DocumentID=${documentID}&DocumentVersionID=${DocumentVersionID}`);
  //   this.http.useBasicAuth(username, userPassword);
  //   return this.http.get(url, {}, {});
  // }

  async downloadFile(userID: any, documentID: any, DocumentVersionID: any, uri: string): Promise<void> {
    const url = encodeURI(`${environment.Endpoint2}?UserID=${userID}&DocumentID=${documentID}&DocumentVersionID=${DocumentVersionID}`);
    console.log('downloadFile url', url);

    const credentials = await this.secureStorageService.getOdataCredentials();
    if (!credentials?.username || !credentials?.password) {
      throw new Error('Missing OData credentials');
    }

    await FileTransfer.downloadFile({
      url,
      path: uri,
      headers: {
        Authorization: 'Basic ' + btoa(credentials.username + ':' + credentials.password)
      }
    });
  }

  async logDocumentOpen(doc: any, userID: string) {    
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
    await this.postDocumentLog(obj)
    .catch(() => {
      const existing = localStorage.getItem('onwi.DocumentLog');
      const log = existing && existing !== '' ? JSON.parse(existing) : [];
      log.push(obj);
      localStorage.setItem('onwi.DocumentLog', JSON.stringify(log));
    });
  }
}
