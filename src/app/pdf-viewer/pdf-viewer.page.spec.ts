import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PdfViewerPage } from './pdf-viewer.page';

describe('PdfViewerPage', () => {
  let component: PdfViewerPage;
  let fixture: ComponentFixture<PdfViewerPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PdfViewerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
