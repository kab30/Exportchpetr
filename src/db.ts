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

export class NovelDB extends Dexie {
  novels!: Table<Novel>;
  chapters!: Table<Chapter>;

  constructor() {
    super('NovelDB');
    this.version(1).stores({
      novels: '++id, title, createdAt',
      chapters: '++id, novelId, chapterNumber, createdAt, [novelId+chapterNumber]'
    });
  }
}

export const db = new NovelDB();
