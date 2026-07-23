import { Injectable } from "@angular/core";
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { OdataCredentials } from "src/types/types";

@Injectable({
    providedIn: 'root'
})
export class SecureStorageService {
    private readonly ODATA_CREDS_KEY: string = 'odata_credentials';

    async setOdataCredentials(username: string, password: string): Promise<void> {
        const credentials: OdataCredentials = { username, password };
        await SecureStorage.set(this.ODATA_CREDS_KEY, credentials);
    }

    async getOdataCredentials(): Promise<OdataCredentials | null> {
        const result = await SecureStorage.get(this.ODATA_CREDS_KEY);
        return result as OdataCredentials | null;
    }

    async clearOdataCredentials(): Promise<void> {
        await SecureStorage.remove(this.ODATA_CREDS_KEY);
    }
}