export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number;
  coverArt: string;
  audioSrc?: string;
  file?: File;
  url?: string;
  lyrics?: string;
  isLiked?: boolean;
}

export interface Playlist {
  id: number;
  name: string;
  songs: Song[];
  coverArt: string;
}

export interface Album {
  name: string;
  artist: string;
  coverArt: string;
  songs: Song[];
}
