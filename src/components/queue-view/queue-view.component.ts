import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MusicService } from '../../services/music.service';
import { Song } from '../../types/music.types';

@Component({
  selector: 'app-queue-view',
  templateUrl: './queue-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueueViewComponent {
  musicService = inject(MusicService);
  
  currentSong = this.musicService.currentSong;
  songQueue = this.musicService.songQueue;
  isPlaying = this.musicService.isPlaying;

  playFromQueue(song: Song) {
    this.musicService.playFromQueue(song);
  }

  removeFromQueue(songId: number) {
    this.musicService.removeFromQueue(songId);
  }
}
