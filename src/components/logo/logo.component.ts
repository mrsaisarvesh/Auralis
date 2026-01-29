import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  template: `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 100 100" 
         class="w-8 h-8 text-red-600" 
         aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="10"/>
      <path d="M25 50 H 35 L 40 40 L 45 60 L 50 45 L 55 55 L 60 40 L 65 50 H 75" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="6" 
            stroke-linecap="round" 
            stroke-linejoin="round"/>
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {}