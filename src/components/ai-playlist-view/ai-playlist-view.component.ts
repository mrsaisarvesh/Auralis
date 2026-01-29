import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MusicService } from '../../services/music.service';

@Component({
  selector: 'app-ai-playlist-view',
  templateUrl: './ai-playlist-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiPlaylistViewComponent {
  musicService = inject(MusicService);
  prompt = signal('');
  isLoading = signal(false);

  async generatePlaylist() {
    if (!this.prompt().trim()) return;
    this.isLoading.set(true);
    await this.musicService.generateAiPlaylist(this.prompt());
    this.isLoading.set(false);
    this.prompt.set('');
  }
}
