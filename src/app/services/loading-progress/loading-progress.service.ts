import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface LoadingStage {
  label: string;
  progress: number; // 0 to 1
}

@Injectable({
  providedIn: 'root',
})
export class LoadingProgressService {
  private state = new BehaviorSubject<LoadingStage>({ label: '', progress: 0 });
  state$ = this.state.asObservable();

  private totalSteps = 0;
  private currentStep = 0;

  start(totalSteps: number) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.state.next({ label: 'Starting...', progress: 0 });
  }

  nextStep(label: string) {
    this.currentStep++;
    const progress = this.totalSteps ? this.currentStep / this.totalSteps : 0;
    this.state.next({ label, progress });
  }

  finish() {
    this.state.next({ label: 'Done', progress: 1 });
  }
}