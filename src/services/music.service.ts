import { Injectable, signal, computed, effect, WritableSignal, untracked, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Song, Playlist, Album } from '../types/music.types';
import { ToastService } from './toast.service';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  private audioElement: HTMLAudioElement = new Audio();
  private toastService = inject(ToastService);
  private router = inject(Router);
  private readonly LIBRARY_PLAYLIST_ID = 0;
  private ai: GoogleGenAI | null = null;

  // Mock Data
  private readonly MOCK_PLAYLISTS: Playlist[] = [
    {
      id: 1,
      name: 'Chill Beats',
      coverArt: 'https://picsum.photos/seed/chill/300/300',
      songs: [
        { id: 101, title: 'Morning Dew', artist: 'Lo-Fi Geek', album: 'Coffee Shop Vibes', duration: '2:45', durationSeconds: 165, coverArt: 'https://picsum.photos/seed/chill1/300/300', audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', lyrics: `(Verse 1)
Woke up this morning, sun in the sky
Another day passing, wondering why
The coffee is brewing, the world's still asleep
Got promises, promises I need to keep

(Chorus)
Oh, the morning dew, fresh and so clear
Washes away all the doubt and the fear
A simple new start, a moment of peace
Hoping this feeling will never cease`, isLiked: true },
        { id: 102, title: 'Sunset Drive', artist: 'Synth Wave', album: 'Retro Dreams', duration: '3:12', durationSeconds: 192, coverArt: 'https://picsum.photos/seed/chill2/300/300', audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', lyrics: `(Verse 1)
Neon lights flicker, the city below
Chasing the horizon, putting on a show
Engine is humming a synth-wave tune
Under the glow of the digital moon

(Chorus)
Sunset drive, yeah, we're lost in the sound
Miles and miles, not a soul is around
Just the rhythm and the road, a retro dream
Living life in a vibrant sunbeam`, isLiked: false },
        { id: 103, title: 'Rainy Night', artist: 'Jazz Hop Cafe', album: 'Midnight Moods', duration: '3:30', durationSeconds: 210, coverArt: 'https://picsum.photos/seed/chill3/300/300', audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', isLiked: false }
      ]
    },
    {
      id: 2,
      name: 'Indie Rock Road Trip',
      coverArt: 'https://picsum.photos/seed/indie/300/300',
      songs: [
        { id: 201, title: 'Golden Haze', artist: 'The Wanderers', album: 'Desert Sun', duration: '4:02', durationSeconds: 242, coverArt: 'https://picsum.photos/seed/indie1/300/300', audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', lyrics: `(Verse 1)
Dust on the dashboard, map on the seat
Heading out west to an unknown beat
The sun's hanging low, a golden haze
Losing ourselves in these wandering days

(Chorus)
Oh, the open road, calling my name
Playing a wild, unpredictable game
With a guitar in the back and hope in our eyes
Underneath these vast, desert skies`, isLiked: false },
        { id: 202, title: 'Coastal Towns', artist: 'Seafoam Green', album: 'The Lighthouse', duration: '3:28', durationSeconds: 208, coverArt: 'https://picsum.photos/seed/indie2/300/300', audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', isLiked: true }
      ]
    }
  ];

  // State Signals
  playlists: WritableSignal<Playlist[]>;
  viewedPlaylist = signal<Playlist | null>(null);
  playbackContext = signal<Playlist | null>(null);
  
  private _currentSong = signal<Song | null>(null);
  currentSong = this._currentSong.asReadonly();

  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(0.75);
  isMuted = signal(false);
  isShuffling = signal(false);
  repeatMode = signal<'off' | 'all' | 'one'>('off');
  private originalSongsOrder = new Map<number, Song[]>();
  
  globalSearchTerm = signal('');
  currentAlbum = signal<Album | null>(null);
  songQueue: WritableSignal<Song[]> = signal([]);
  
  searchResults = signal<Song[]>([]);
  isSearching = signal(false);
  private searchTimeout: any;

  songHistory: WritableSignal<Song[]> = signal([]);

  // Computed Signals
  progress = computed(() => this.duration() > 0 ? (this.currentTime() / this.duration()) * 100 : 0);
  private allSongs = computed(() => this.playlists().filter(p => p.id !== this.LIBRARY_PLAYLIST_ID).flatMap(p => p.songs));
  
  constructor() {
    try {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch(e) {
      console.error("Failed to initialize GoogleGenAI", e);
    }
    
    const allMockSongs = this.MOCK_PLAYLISTS.flatMap(p => p.songs);
    const initialPlaylists: Playlist[] = [
      {
        id: this.LIBRARY_PLAYLIST_ID,
        name: 'Your Library',
        coverArt: 'https://picsum.photos/seed/library/300/300',
        songs: allMockSongs.filter(s => s.isLiked)
      },
      ...this.MOCK_PLAYLISTS
    ];
    this.playlists = signal(initialPlaylists);
    this.viewedPlaylist.set(initialPlaylists[1]);
    this.playbackContext.set(initialPlaylists[1]);


    this.audioElement.addEventListener('timeupdate', () => this.currentTime.set(this.audioElement.currentTime));
    this.audioElement.addEventListener('loadedmetadata', () => {
      const durationSeconds = this.audioElement.duration;
      this.duration.set(durationSeconds);
      
      const currentSong = this.currentSong();
      // Only update if duration is 0, which we set for local files.
      if (currentSong && currentSong.durationSeconds === 0) {
          this.updateSongInState(currentSong.id, {
              duration: this.formatTime(durationSeconds),
              durationSeconds: durationSeconds,
          });
      }
    });
    this.audioElement.addEventListener('ended', () => {
      if (this.repeatMode() === 'one') {
        this.audioElement.currentTime = 0;
        this.play();
      } else {
        this.nextSong();
      }
    });
    this.audioElement.volume = this.volume();

    effect(() => {
      const vol = this.volume();
      untracked(() => this.audioElement.volume = vol);
    });

     effect(() => {
      const muted = this.isMuted();
      untracked(() => this.audioElement.muted = muted);
    });
  }

  async generateAiPlaylist(prompt: string) {
    if (!this.ai) {
      this.toastService.showToast('AI service is not available.');
      return;
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a playlist of 8 songs for the following prompt: "${prompt}". Provide only song titles and artist names.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              songs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING },
                  },
                  required: ["title", "artist"],
                },
              },
            },
            required: ["songs"],
          },
        },
      });

      const jsonResponse = JSON.parse(response.text.trim());
      const aiSongs: { title: string; artist: string }[] = jsonResponse.songs;

      if (!aiSongs || aiSongs.length === 0) {
        this.toastService.showToast('Could not generate a playlist from that prompt.');
        return;
      }
      
      const newPlaylistId = Date.now();
      const newSongs: Song[] = aiSongs.map((song, index) => ({
        id: newPlaylistId + index,
        title: song.title,
        artist: song.artist,
        album: prompt,
        duration: '3:30',
        durationSeconds: 210,
        coverArt: `https://picsum.photos/seed/${newPlaylistId + index}/300/300`,
        audioSrc: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(index % 16) + 1}.mp3`,
        isLiked: false,
      }));

      const newPlaylist: Playlist = {
        id: newPlaylistId,
        name: prompt.length > 25 ? prompt.substring(0, 22) + '...' : prompt,
        coverArt: `https://picsum.photos/seed/${newPlaylistId}/300/300`,
        songs: newSongs,
      };

      this.playlists.update(playlists => [newPlaylist, ...playlists]);
      this.selectPlaylist(newPlaylist);
      this.toastService.showToast(`AI Playlist "${newPlaylist.name}" created!`);

    } catch (error) {
      console.error('Error generating AI playlist:', error);
      this.toastService.showToast('Failed to generate AI playlist. Please try again.');
    }
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private updateSongInState(songId: number, updates: Partial<Song>) {
    let updatedSong: Song | undefined;

    this.playlists.update(playlists => {
        const newPlaylists = playlists.map(p => ({
            ...p,
            songs: p.songs.map(s => {
                if (s.id === songId) {
                    updatedSong = { ...s, ...updates };
                    return updatedSong;
                }
                return s;
            })
        }));
        
        if (updatedSong) {
            const libraryPlaylist = newPlaylists.find(p => p.id === this.LIBRARY_PLAYLIST_ID);
            if (libraryPlaylist) {
                const songIndex = libraryPlaylist.songs.findIndex(s => s.id === songId);
                if (songIndex > -1) {
                    libraryPlaylist.songs[songIndex] = updatedSong;
                }
            }
        }
        
        if (this._currentSong()?.id === songId && updatedSong) {
            this._currentSong.set(updatedSong);
        }

        return newPlaylists;
    });

    if (updatedSong) {
        this.songQueue.update(queue => queue.map(s => s.id === songId ? updatedSong! : s));
        this.searchResults.update(results => results.map(s => s.id === songId ? updatedSong! : s));
        this.songHistory.update(history => history.map(s => s.id === songId ? updatedSong! : s));
        
        if (this.currentAlbum()?.songs.some(s => s.id === songId)) {
            this.currentAlbum.update(album => album ? ({ ...album, songs: album.songs.map(s => s.id === songId ? updatedSong! : s) }) : null);
        }
        
        if (this.viewedPlaylist()?.songs.some(s => s.id === songId)) {
            this.viewedPlaylist.update(p => p ? ({...p, songs: p.songs.map(s => s.id === songId ? updatedSong! : s)}) : null);
        }

        if (this.playbackContext()?.songs.some(s => s.id === songId)) {
            this.playbackContext.update(p => p ? ({...p, songs: p.songs.map(s => s.id === songId ? updatedSong! : s)}) : null);
        }
    }
  }

  toggleSongInLibrary(songId: number) {
    let targetSong: Song | undefined;
    let wasLiked: boolean | undefined;

    this.playlists.update(playlists => {
        const newPlaylists = playlists.map(p => ({
            ...p,
            songs: p.songs.map(s => {
                if (s.id === songId) {
                    wasLiked = s.isLiked;
                    targetSong = { ...s, isLiked: !s.isLiked };
                    return targetSong;
                }
                return s;
            })
        }));

        if (targetSong) {
            const libraryPlaylist = newPlaylists.find(p => p.id === this.LIBRARY_PLAYLIST_ID);
            if (libraryPlaylist) {
                if (targetSong.isLiked) {
                    if (!libraryPlaylist.songs.some(s => s.id === songId)) {
                        libraryPlaylist.songs.push(targetSong);
                    }
                } else {
                    libraryPlaylist.songs = libraryPlaylist.songs.filter(s => s.id !== songId);
                }
            }
        }
        
        if (this._currentSong()?.id === songId && targetSong) {
            this._currentSong.set(targetSong);
        }

        return newPlaylists;
    });

    if (targetSong) {
        this.songQueue.update(queue => queue.map(s => s.id === songId ? targetSong! : s));
        this.searchResults.update(results => results.map(s => s.id === songId ? targetSong! : s));
        this.songHistory.update(history => history.map(s => s.id === songId ? targetSong! : s));
        if (this.currentAlbum()?.songs.some(s => s.id === songId)) {
             this.currentAlbum.update(album => album ? ({ ...album, songs: album.songs.map(s => s.id === songId ? targetSong! : s) }) : null);
        }
    }

    if (wasLiked !== undefined) {
        const message = !wasLiked ? 'Added to Your Library' : 'Removed from Your Library';
        this.toastService.showToast(message);
    }
    
    const updatedLibraryPlaylist = this.playlists().find(p => p.id === this.LIBRARY_PLAYLIST_ID)!;

    if (this.viewedPlaylist()?.id === this.LIBRARY_PLAYLIST_ID) {
        this.viewedPlaylist.set(updatedLibraryPlaylist);
    }
     if (this.playbackContext()?.id === this.LIBRARY_PLAYLIST_ID) {
        this.playbackContext.set(updatedLibraryPlaylist);
    }
  }

  searchAllSongs(term: string) {
    this.globalSearchTerm.set(term);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (!term) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);

    this.searchTimeout = setTimeout(() => {
      const results = this.allSongs().filter(
        song => song.title.toLowerCase().includes(term.toLowerCase()) || song.artist.toLowerCase().includes(term.toLowerCase())
      );
      this.searchResults.set(results);
      this.isSearching.set(false);
    }, 500); // Simulate network delay
  }
  
  navigateToAlbum(albumName: string, artistName: string) {
    this.router.navigate(['/album', artistName, albumName]);
  }

  loadAlbum(albumName: string, artistName: string) {
    const albumSongs = this.allSongs().filter(
      song => song.album === albumName && song.artist === artistName
    );
    if (albumSongs.length > 0) {
      this.currentAlbum.set({
        name: albumName,
        artist: artistName,
        coverArt: albumSongs[0].coverArt,
        songs: albumSongs
      });
    } else {
      this.currentAlbum.set(null);
    }
  }

  private _buildQueue(fromPlaylist: Playlist, startWithSong: Song) {
    const songIndex = fromPlaylist.songs.findIndex(s => s.id === startWithSong.id);
    if (songIndex > -1) {
      const nextSongs = fromPlaylist.songs.slice(songIndex + 1);
      this.songQueue.set(nextSongs);
    } else {
      this.songQueue.set([]);
    }
  }

  toggleShuffle() {
    this.isShuffling.update(s => !s);
    const context = this.playbackContext();
    const song = this.currentSong();
    if (!context || !song) return;

    let newSongsOrder: Song[];

    if (this.isShuffling()) {
        if (!this.originalSongsOrder.has(context.id)) {
            this.originalSongsOrder.set(context.id, [...context.songs]);
        }
        const songsToShuffle = context.songs.filter(s => s.id !== song.id);
        for (let i = songsToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songsToShuffle[i], songsToShuffle[j]] = [songsToShuffle[j], songsToShuffle[i]];
        }
        newSongsOrder = [song, ...songsToShuffle];
    } else {
        const originalOrder = this.originalSongsOrder.get(context.id);
        newSongsOrder = originalOrder ? originalOrder : context.songs;
    }

    this.updatePlaylistSongsInState(context.id, newSongsOrder);
    
    const updatedContext = this.playlists().find(p => p.id === context.id);
    if(updatedContext) {
        this._buildQueue(updatedContext, song);
    }
  }

  toggleRepeatMode() {
    this.repeatMode.update(current => {
      if (current === 'off') return 'all';
      if (current === 'all') return 'one';
      return 'off';
    });
  }

  private updatePlaylistSongsInState(playlistId: number, newSongs: Song[]) {
    let updatedPlaylist: Playlist | undefined;
    this.playlists.update(allPlaylists => {
        const playlistIndex = allPlaylists.findIndex(p => p.id === playlistId);
        if (playlistIndex !== -1) {
            updatedPlaylist = { ...allPlaylists[playlistIndex], songs: newSongs };
            allPlaylists[playlistIndex] = updatedPlaylist;
            return [...allPlaylists];
        }
        return allPlaylists;
    });

    if (updatedPlaylist) {
      if (this.viewedPlaylist()?.id === playlistId) {
          this.viewedPlaylist.set(updatedPlaylist);
      }
      if (this.playbackContext()?.id === playlistId) {
          this.playbackContext.set(updatedPlaylist);
      }
    }
  }

  selectPlaylist(playlist: Playlist) {
    this.viewedPlaylist.set(playlist);
    this.playbackContext.set(playlist);
    this.router.navigate(['/home']);
  }

  playSong(song: Song, context: Playlist) {
    if (this.currentSong()?.id === song.id) {
        this.togglePlayPause();
        return;
    }
    
    this.songHistory.update(history => {
      const newHistory = [song, ...history.filter(s => s.id !== song.id)];
      return newHistory.slice(0, 50);
    });

    this.audioElement.pause(); // Fix: Prevent interruption error

    this.playbackContext.set(context);
    this._buildQueue(context, song);
    
    this._currentSong.set(song);
    this.audioElement.src = song.url || song.audioSrc || '';
    this.play();
  }

  play() {
    if (!this.currentSong()) {
       const context = this.playbackContext() ?? this.playlists()[0];
       if(context && context.songs.length > 0) {
           this.playSong(context.songs[0], context);
       }
       return;
    }
    this.audioElement.play().then(() => this.isPlaying.set(true)).catch(e => {
      console.error("Playback failed", e)
      this.isPlaying.set(false); // Fix: Ensure state is correct on failure
    });
  }

  pause() {
    this.audioElement.pause();
    this.isPlaying.set(false);
  }

  togglePlayPause() {
      if(this.isPlaying()){
          this.pause();
      } else {
          this.play();
      }
  }

  seek(value: number) {
    const newTime = (value / 100) * this.duration();
    this.audioElement.currentTime = newTime;
    this.currentTime.set(newTime);
  }

  setVolume(value: number) {
    this.volume.set(value);
    if(value > 0) {
      this.isMuted.set(false);
    }
  }

  toggleMute() {
    this.isMuted.update(muted => !muted);
  }

  private findSongIndexInContext(): number {
    const song = this.currentSong();
    const context = this.playbackContext();
    if (!song || !context) return -1;
    return context.songs.findIndex(s => s.id === song.id);
  }

  nextSong() {
    const queue = this.songQueue();
    if (queue.length > 0) {
        const nextInQueue = queue[0];
        this.playSong(nextInQueue, this.playbackContext()!);
        this.songQueue.update(q => q.slice(1));
        return;
    }

    const context = this.playbackContext();
    if (!context || context.songs.length === 0) return;

    const currentIndex = this.findSongIndexInContext();

    if (this.repeatMode() === 'off' && currentIndex === context.songs.length - 1) {
      this.pause();
      this.audioElement.currentTime = 0;
      return;
    }
    
    const nextIndex = (currentIndex + 1) % context.songs.length;
    this.playSong(context.songs[nextIndex], context);
  }

  previousSong() {
    const context = this.playbackContext();
    if (!context || context.songs.length === 0) return;

    if (this.currentTime() > 3) {
      this.audioElement.currentTime = 0;
      return;
    }
    
    const currentIndex = this.findSongIndexInContext();
    const prevIndex = (currentIndex - 1 + context.songs.length) % context.songs.length;
    this.playSong(context.songs[prevIndex], context);
  }
  
  removeFromQueue(songId: number) {
    this.songQueue.update(queue => queue.filter(song => song.id !== songId));
  }

  playFromQueue(songToPlay: Song) {
    const queue = this.songQueue();
    const songIndex = queue.findIndex(s => s.id === songToPlay.id);
    if (songIndex > -1) {
        this.playSong(songToPlay, this.playbackContext()!);
        this.songQueue.set(queue.slice(songIndex + 1));
    }
  }

  addSongToPlaylist(song: Song, playlistId: number) {
    const playlist = this.playlists().find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.songs.some(s => s.id === song.id)) {
      this.toastService.showToast(`Song is already in "${playlist.name}"`);
      return;
    }
    
    const updatedSongs = [...playlist.songs, song];
    this.updatePlaylistSongsInState(playlistId, updatedSongs);
    
    if (this.originalSongsOrder.has(playlistId)) {
      const originalOrder = this.originalSongsOrder.get(playlistId);
      if (originalOrder) {
        this.originalSongsOrder.set(playlistId, [...originalOrder, song]);
      }
    }
    
    this.toastService.showToast(`Added to "${playlist.name}"`);
  }

  addLocalFiles(files: FileList) {
    const localSongs: Song[] = Array.from(files).map((file, index) => {
      const now = Date.now();
      return {
        id: now + index,
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Unknown Artist',
        album: 'Local Files',
        duration: '0:00',
        durationSeconds: 0,
        coverArt: 'https://picsum.photos/seed/local/300/300',
        file: file,
        url: URL.createObjectURL(file),
        isLiked: false,
      };
    });

    this.playlists.update(playlists => {
        const localPlaylistIndex = playlists.findIndex(p => p.id === -1);
        let newPlaylists = [...playlists];
        let updatedLocalPlaylist;

        if (localPlaylistIndex > -1) {
            const existingPlaylist = newPlaylists[localPlaylistIndex];
            const newSongs = [...existingPlaylist.songs, ...localSongs];
            updatedLocalPlaylist = { ...existingPlaylist, songs: newSongs };
            newPlaylists[localPlaylistIndex] = updatedLocalPlaylist;

            if (this.originalSongsOrder.has(-1)) {
                this.originalSongsOrder.get(-1)!.push(...localSongs);
            }
        } else {
            updatedLocalPlaylist = {
                id: -1,
                name: 'Local Files',
                coverArt: 'https://picsum.photos/seed/local/300/300',
                songs: localSongs
            };
            newPlaylists.push(updatedLocalPlaylist);
        }
        this.selectPlaylist(updatedLocalPlaylist);
        return newPlaylists;
    });
  }
}