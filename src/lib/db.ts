import Dexie, { type Table } from 'dexie';

export interface FormProgress {
  id: string; // formId
  answers: Record<string, any>;
  currentPage: number;
  updatedAt: number;
}

export class FormToDatabase extends Dexie {
  progress!: Table<FormProgress>;

  constructor() {
    super('FormToDB');
    this.version(1).stores({
      progress: 'id' // Primary key is the formId
    });
  }
}

export const db = new FormToDatabase();
