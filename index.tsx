import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';
import { provideRouter, withHashLocation, Routes } from '@angular/router';

import { MainViewComponent } from './src/components/main-view/main-view.component';
import { SearchViewComponent } from './src/components/search-view/search-view.component';
import { AlbumViewComponent } from './src/components/album-view/album-view.component';
import { QueueViewComponent } from './src/components/queue-view/queue-view.component';
import { LyricsViewComponent } from './src/components/lyrics-view/lyrics-view.component';
import { HistoryViewComponent } from './src/components/history-view/history-view.component';
import { AiPlaylistViewComponent } from './src/components/ai-playlist-view/ai-playlist-view.component';
import { BottomNavComponent } from './src/components/bottom-nav/bottom-nav.component';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: MainViewComponent },
  { path: 'search', component: SearchViewComponent },
  { path: 'album/:artist/:name', component: AlbumViewComponent },
  { path: 'queue', component: QueueViewComponent },
  { path: 'lyrics', component: LyricsViewComponent },
  { path: 'history', component: HistoryViewComponent },
  { path: 'ai-playlist', component: AiPlaylistViewComponent },
  { path: '**', redirectTo: 'home' } // Fallback route
];

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation())
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.