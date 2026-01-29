import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-lyrics-view',
  templateUrl: './lyrics-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LyricsViewComponent {
  musicService = inject(MusicService);
  currentSong = this.musicService.currentSong;
}
