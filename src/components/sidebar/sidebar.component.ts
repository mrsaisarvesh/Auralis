import { ChangeDetectionStrategy, Component, inject, viewChild, ElementRef, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MusicService } from '../../services/music.service';
import { Playlist } from '../../types/music.types';
import { LogoComponent } from '../logo/logo.component';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoComponent],
})
export class SidebarComponent {
  musicService = inject(MusicService);
  router = inject(Router);
  playlists = this.musicService.playlists;
  viewedPlaylist = this.musicService.viewedPlaylist;
  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  isHomeViewActive = computed(() => this.router.url === '/home' || this.router.url === '/');

  selectPlaylist(playlist: Playlist) {
    this.musicService.selectPlaylist(playlist);
  }

  openFilePicker() {
    this.fileInput().nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.musicService.addLocalFiles(input.files);
    }
  }
}
