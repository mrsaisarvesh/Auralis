import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-player-controls',
  templateUrl: './player-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
})
export class PlayerControlsComponent {
  musicService = inject(MusicService);
  
  currentSong = this.musicService.currentSong;
  isPlaying = this.musicService.isPlaying;
  progress = this.musicService.progress;
  volume = this.musicService.volume;
  isMuted = this.musicService.isMuted;
  isShuffling = this.musicService.isShuffling;
  repeatMode = this.musicService.repeatMode;

  currentTime = computed(() => this.formatTime(this.musicService.currentTime()));
  duration = computed(() => this.formatTime(this.musicService.duration()));

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  onProgressChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.musicService.seek(Number(input.value));
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.musicService.setVolume(Number(input.value));
  }
  
  toggleLike() {
    const song = this.currentSong();
    if (song) {
      this.musicService.toggleSongInLibrary(song.id);
    }
  }
}
