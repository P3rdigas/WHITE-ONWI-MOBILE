import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LoadingProgressService, LoadingStage } from 'src/app/services/loading-progress/loading-progress.service';

@Component({
  selector: 'app-loading-progress',
  templateUrl: './loading-progress.component.html',
  styleUrls: ['./loading-progress.component.scss'],
  standalone: false
})
export class LoadingProgressComponent implements OnInit, OnDestroy {
  stage: LoadingStage = { label: '', progress: 0 };
  private sub: Subscription;

  constructor(
    private loadingProgress: LoadingProgressService,
  ) { }

  ngOnInit() {
    this.sub = this.loadingProgress.state$.subscribe(s => this.stage = s);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

}
