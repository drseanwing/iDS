import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface BackupStatus {
  lastRunAt: Date | null;
  lastRunStatus: 'success' | 'failure' | 'never';
  lastBackupFile: string | null;
  lastErrorMessage: string | null;
  nextScheduledAt: Date | null;
}

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);

  private lastRunAt: Date | null = null;
  private lastRunStatus: 'success' | 'failure' | 'never' = 'never';
  private lastBackupFile: string | null = null;
  private lastErrorMessage: string | null = null;
  private schedulerHandle: ReturnType<typeof setInterval> | null = null;

  // Run daily at 02:00 – check every minute, fire when hour=2 and minute=0
  private readonly SCHEDULE_HOUR = 2;
  private readonly SCHEDULE_MINUTE = 0;
  private readonly CHECK_INTERVAL_MS = 60_000; // 1 minute

  onModuleInit(): void {
    this.startScheduler();
    this.logger.log(
      `Backup scheduler started – daily backups at ${this.SCHEDULE_HOUR.toString().padStart(2, '0')}:${this.SCHEDULE_MINUTE.toString().padStart(2, '0')}`,
    );
  }

  onModuleDestroy(): void {
    if (this.schedulerHandle) {
      clearInterval(this.schedulerHandle);
      this.schedulerHandle = null;
      this.logger.log('Backup scheduler stopped');
    }
  }

  private startScheduler(): void {
    this.schedulerHandle = setInterval(() => {
      const now = new Date();
      if (
        now.getHours() === this.SCHEDULE_HOUR &&
        now.getMinutes() === this.SCHEDULE_MINUTE
      ) {
        this.logger.log('Scheduled backup triggered');
        this.runBackup().catch((err: Error) => {
          this.logger.error(`Scheduled backup error: ${err.message}`, err.stack);
        });
      }
    }, this.CHECK_INTERVAL_MS);
  }

  async runBackup(): Promise<BackupStatus> {
    const startedAt = new Date();
    this.logger.log('Starting PostgreSQL backup...');

    // Resolve the backup script path relative to this project
    const scriptPath = this.resolveScriptPath();

    // Build environment for pg_dump
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      BACKUP_DIR: process.env.BACKUP_DIR ?? '/backups/postgresql',
    };

    // Pass DATABASE_URL through if set; otherwise individual PG_ vars
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      env.DATABASE_URL = databaseUrl;
    } else {
      if (process.env.PG_HOST)     env.PG_HOST     = process.env.PG_HOST;
      if (process.env.PG_PORT)     env.PG_PORT     = process.env.PG_PORT;
      if (process.env.PG_USER)     env.PG_USER     = process.env.PG_USER;
      if (process.env.PG_DB)       env.PG_DB       = process.env.PG_DB;
      if (process.env.PGPASSWORD)  env.PGPASSWORD  = process.env.PGPASSWORD;
    }

    try {
      const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
        env,
        timeout: 10 * 60 * 1000, // 10 min max
      });

      if (stdout) this.logger.log(`Backup output:\n${stdout.trim()}`);
      if (stderr) this.logger.warn(`Backup stderr:\n${stderr.trim()}`);

      // Extract backup file path from output
      const match = stdout.match(/Backup created:\s*(\S+)/);
      this.lastBackupFile = match ? match[1] : null;
      this.lastRunAt = startedAt;
      this.lastRunStatus = 'success';
      this.lastErrorMessage = null;

      this.logger.log(`Backup completed successfully at ${startedAt.toISOString()}`);
    } catch (err: any) {
      this.lastRunAt = startedAt;
      this.lastRunStatus = 'failure';
      this.lastErrorMessage = err.message?.substring(0, 500) ?? 'Unknown error';
      this.logger.error(`Backup failed: ${this.lastErrorMessage}`, err.stack);
    }

    return this.getStatus();
  }

  getStatus(): BackupStatus {
    const nextScheduledAt = this.computeNextRun();
    return {
      lastRunAt: this.lastRunAt,
      lastRunStatus: this.lastRunStatus,
      lastBackupFile: this.lastBackupFile,
      lastErrorMessage: this.lastErrorMessage,
      nextScheduledAt,
    };
  }

  private computeNextRun(): Date {
    const now = new Date();
    const next = new Date(now);
    next.setHours(this.SCHEDULE_HOUR, this.SCHEDULE_MINUTE, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  private resolveScriptPath(): string {
    // Try relative to project root; fall back to env var
    const candidates = [
      process.env.PG_BACKUP_SCRIPT,
      path.resolve(__dirname, '../../../../infra/backup/pg-backup.sh'),
      '/infra/backup/pg-backup.sh',
    ];

    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // Return best-guess path; exec will fail with a clear message if missing
    return candidates[1] as string;
  }
}
