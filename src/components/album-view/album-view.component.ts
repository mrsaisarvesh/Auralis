import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MusicService } from '../../services/music.service';
import { Song } from '../../types/music.types';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-album-view',
  templateUrl: './album-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick()',
  },
})
export class AlbumViewComponent implements OnInit {
  musicService = inject(MusicService);
  toastService = inject(ToastService);
  route = inject(ActivatedRoute);
  currentAlbum = this.musicService.currentAlbum;
  currentSong = this.musicService.currentSong;
  isPlaying = this.musicService.isPlaying;

  activeMenuSongId = signal<number | null>(null);
  activeShareMenuSongId = signal<number | null>(null);
  
  userPlaylists = computed(() => this.musicService.playlists().filter(p => p.id > 0));

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const artist = params['artist'];
      const name = params['name'];
      if(artist && name) {
        this.musicService.loadAlbum(name, artist);
      }
    });
  }

  onDocumentClick(): void {
    this.activeMenuSongId.set(null);
    this.activeShareMenuSongId.set(null);
  }

  playSong(song: Song) {
    const album = this.currentAlbum();
    if (!album) return;

    // Create a temporary playlist from the album to allow playback context
    const albumPlaylist = {
      id: -2, // Use a temporary unique ID for album context
      name: album.name,
      coverArt: album.coverArt,
      songs: album.songs,
    };
    this.musicService.playSong(song, albumPlaylist);
  }

  toggleLike(songId: number, event: MouseEvent) {
    event.stopPropagation();
    this.musicService.toggleSongInLibrary(songId);
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
}