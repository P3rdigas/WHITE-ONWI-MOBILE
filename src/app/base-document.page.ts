import { Directive, ViewChild } from "@angular/core";
import { IonContent } from "@ionic/angular";
import { UtilsService } from "./services/utils/utils.service";

@Directive()
export abstract class BaseDocumentPage {
    public showScroll= false;
    protected networkStatus: any;
    protected user: any;
    
    @ViewChild(IonContent, { static: false }) content: IonContent;

    constructor(protected utilsService: UtilsService) {}

    logScrolling(event: any) {
        this.showScroll = event.detail.scrollTop >= 135;
    }

    scrollTop() {
        this.content.scrollToTop(400);
    }

    splitVersion(version: string): { top: string; bottom: string } {
        if (!version) return { top: '', bottom: '' };
        const match = version.match(/\sTR\./);
        if (!match || match.index === undefined) {
        return { top: version.trim(), bottom: '' };
        }
        const top = version.substring(0, match.index).trim();
        const bottom = version.substring(match.index).trim();
        return { top, bottom };
    }

    async addFavorite(doc: any, indexDoc: number) {
        const canProceed = await this.canProceedWithNetwork(
            this.networkStatus,
            'You need an internet connection to add favorites.',
            'Do you want to update your favorites using mobile data?'
            
        );
        if (!canProceed) return;

        await this.utilsService.addFavorite(doc, this.user);
        await this.utilsService.backgroundUpdateFavorites();
    }

    async removeFavorite(doc: any, indexDoc: number) {
        const canProceed = await this.canProceedWithNetwork(
            this.networkStatus,
            'You need an internet connection to remove favorites.',
            'Do you want to update your favorites using mobile data?'
        );
        if (!canProceed) return;

        await this.utilsService.removeFavorite(doc);
        await this.utilsService.backgroundUpdateFavorites();
    }

    protected async canProceedWithNetwork(networkStatus: string, offlineMessage: string, actionMessage: string): Promise<boolean> {
        if (networkStatus === 'offline') {
            await this.utilsService.notifyOffline(offlineMessage);
            return false;
        }

        if (networkStatus !== 'wifi') {
            const allowed = await this.utilsService.validateMobileDataUsage(actionMessage);
            if (!allowed) return false;
        }

        return true;
    }

    exit() {
        this.utilsService.exitApp(true);
    }
}