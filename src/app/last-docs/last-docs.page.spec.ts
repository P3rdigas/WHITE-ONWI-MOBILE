import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { LastDocsPage } from './last-docs.page';

describe('LastDocsPage', () => {
  let component: LastDocsPage;
  let fixture: ComponentFixture<LastDocsPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LastDocsPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(LastDocsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
