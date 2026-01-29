import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { PlayerControlsComponent } from './components/player-controls/player-controls.component';
import { MusicService } from './services/music.service';
import { ToastComponent } from './components/toast/toast.component';
import { ToastService } from './services/toast.service';
import { AiPlaylistViewComponent } from './components/ai-playlist-view/ai-playlist-view.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [SidebarComponent, PlayerControlsComponent, ToastComponent, RouterOutlet, AiPlaylistViewComponent, BottomNavComponent],
  providers: [MusicService, ToastService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}