import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { MusicService } from '../../services/music.service';
import { Song } from '../../types/music.types';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-search-view',
  templateUrl: './search-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick()',
  },
})
export class SearchViewComponent implements OnInit, OnDestroy {
  musicService = inject(MusicService);
  toastService = inject(ToastService);
  
  searchTerm = this.musicService.globalSearchTerm;
  searchResults = this.musicService.searchResults;
  currentSong = this.musicService.currentSong;
  isPlaying = this.musicService.isPlaying;
  isSearching = this.musicService.isSearching;

  private searchTerms = new Subject<string>();
  private searchSubscription!: Subscription;

  activeMenuSongId = signal<number | null>(null);
  activeShareMenuSongId = signal<number | null>(null);
  
  userPlaylists = computed(() => this.musicService.playlists().filter(p => p.id > 0));

  ngOnInit() {
    this.searchSubscription = this.searchTerms.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.musicService.searchAllSongs(term);
    });
  }

  ngOnDestroy() {
    this.searchSubscription.unsubscribe();
  }

  onDocumentClick(): void {
    this.activeMenuSongId.set(null);
    this.activeShareMenuSongId.set(null);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerms.next(input.value);
  }

  playSong(song: Song) {
    // Create a temporary playlist from search results for context
    const searchResultsPlaylist = {
      id: -3, // Temporary ID for search context
      name: 'Search Results',
      coverArt: song.coverArt, // Use current song's art
      songs: this.searchResults(),
    };
    this.musicService.playSong(song, searchResultsPlaylist);
  }

  selectAlbum(albumName: string, artistName: string) {
    this.musicService.navigateToAlbum(albumName, artistName);
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