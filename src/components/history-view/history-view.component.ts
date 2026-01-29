import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { MusicService } from '../../services/music.service';
import { Song } from '../../types/music.types';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-history-view',
  templateUrl: './history-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick()',
  },
})
export class HistoryViewComponent {
  musicService = inject(MusicService);
  toastService = inject(ToastService);
  
  songHistory = this.musicService.songHistory;
  currentSong = this.musicService.currentSong;
  isPlaying = this.musicService.isPlaying;
  
  activeMenuSongId = signal<number | null>(null);
  activeShareMenuSongId = signal<number | null>(null);
  
  userPlaylists = computed(() => this.musicService.playlists().filter(p => p.id > 0));

  onDocumentClick(): void {
    this.activeMenuSongId.set(null);
    this.activeShareMenuSongId.set(null);
  }

  toggleMenu(songId: number, event: MouseEvent) {
    event.stopPropagation();
    this.activeShareMenuSongId.set(null);
    this.activeMenuSongId.update(currentId => currentId === songId ? null : songId);
  }

  toggleShareMenu(songId: number, event: MouseEvent) {
    event.stopPropagation();
    this.activeShareMenuSongId.update(currentId => currentId === songId ? null : songId);
  }

  addSongToPlaylist(song: Song, playlistId: number, event: MouseEvent) {
    event.stopPropagation();
    this.musicService.addSongToPlaylist(song, playlistId);
    this.activeMenuSongId.set(null);
  }

  setAsRingtone(song: Song, event: MouseEvent) {
    event.stopPropagation();
    this.toastService.showToast(`'${song.title}' set as ringtone.`);
    this.activeMenuSongId.set(null);
  }

  copySongLink(song: Song, event: MouseEvent) {
    event.stopPropagation();
    const link = `https://auralis.app/song/${song.id}/${encodeURIComponent(song.title)}`;
    navigator.clipboard.writeText(link).then(() => {
      this.toastService.showToast('Song link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy link: ', err);
      this.toastService.showToast('Failed to copy link.');
    });
    this.activeShareMenuSongId.set(null);
    this.activeMenuSongId.set(null);
  }

  playSong(song: Song) {
    // Create a temporary playlist from history for context
    const historyPlaylist = {
      id: -4, // Temporary ID for history context
      name: 'Recently Played',
      coverArt: song.coverArt,
      songs: this.songHistory(),
    };
    this.musicService.playSong(song, historyPlaylist);
  }
  
  toggleLike(songId: number, event: MouseEvent) {
    event.stopPropagation();
    this.musicService.toggleSongInLibrary(songId);
  }

  selectAlbum(albumName: string, artistName: string) {
    this.musicService.navigateToAlbum(albumName, artistName);
  }
}
