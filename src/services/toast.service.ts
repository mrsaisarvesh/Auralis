import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  message = signal<string>('');
  isVisible = signal<boolean>(false);
  private timer: any;

  showToast(message: string) {
    this.message.set(message);
    this.isVisible.set(true);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.isVisible.set(false);
    }, 3000);
  }
}
