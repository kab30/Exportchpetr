import Dexie, { Table } from 'dexie';

export interface Novel {
  id?: number;
  title: string;
  coverImage?: string;
  createdAt: number;
}

export interface Chapter {
  id?: number;
  novelId: number;
  chapterNumber: number;
  title: string;
  content: string;
  createdAt: number;
}

export interface Backup {
  id?: number;
  date: string;
  timestamp: number;
  data: string;
}

export class NovelDB extends Dexie {
  novels!: Table<Novel>;
  chapters!: Table<Chapter>;
  backups!: Table<Backup>;

  constructor() {
    super('NovelDB');
    this.version(1).stores({
      novels: '++id, title, createdAt',
      chapters: '++id, novelId, chapterNumber, createdAt, [novelId+chapterNumber]'
    });
    this.version(2).stores({
      backups: '++id, date, timestamp'
    });
  }
}

export const db = new NovelDB();
