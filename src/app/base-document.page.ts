import { Directive, ViewChild } from "@angular/core";
import { IonContent } from "@ionic/angular";

@Directive()
export abstract class BaseDocumentPage {
    public showScroll= false;
    
    @ViewChild(IonContent, { static: false }) content: IonContent;

    logScrolling(event: any) {
        this.showScroll = event.detail.scrollTop >= 135;
    }

    scrollTop() {
        this.content.scrollToTop(0);
    }
}