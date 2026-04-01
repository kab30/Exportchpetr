import { db } from '../db';

export const createBackup = async () => {
  try {
    const novels = await db.novels.toArray();
    const chapters = await db.chapters.toArray();
    
    const backupData = JSON.stringify({ novels, chapters });
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();

    // Check if backup for today already exists
    const existingBackup = await db.backups.where('date').equals(today).first();
    
    if (existingBackup) {
      // Update existing backup for today
      await db.backups.update(existingBackup.id!, { data: backupData, timestamp });
    } else {
      // Create new backup
      await db.backups.add({ date: today, timestamp, data: backupData });
    }

    // Cleanup old backups (keep only last 3 days)
    const allBackups = await db.backups.orderBy('timestamp').reverse().toArray();
    if (allBackups.length > 3) {
      const backupsToDelete = allBackups.slice(3);
      for (const backup of backupsToDelete) {
        if (backup.id) {
          await db.backups.delete(backup.id);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return false;
  }
};

export const downloadBackupFile = (backupData: string, date: string) => {
  const blob = new Blob([backupData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const restoreFromBackup = async (backupData: string) => {
  try {
    const data = JSON.parse(backupData);
    if (!data.novels || !data.chapters) {
      throw new Error('Invalid backup format');
    }

    await db.transaction('rw', db.novels, db.chapters, async () => {
      await db.novels.clear();
      await db.chapters.clear();
      
      if (data.novels.length > 0) {
        await db.novels.bulkAdd(data.novels);
      }
      if (data.chapters.length > 0) {
        await db.chapters.bulkAdd(data.chapters);
      }
    });
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
};
