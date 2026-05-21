import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';

const execAsync = promisify(exec);

export interface BackupStatus {
  lastRunAt: Date | null;
  lastRunStatus: 'success' | 'failure' | 'never';
  lastBackupFile: string | null;
  lastErrorMessage: string | null;
  nextScheduledAt: Date | null;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  private lastRunAt: Date | null = null;
  private lastRunStatus: 'success' | 'failure' | 'never' = 'never';
  private lastBackupFile: string | null = null;
  private lastErrorMessage: string | null = null;

  @Cron('0 2 * * *')
  async runScheduledBackup(): Promise<void> {
    this.logger.log('Scheduled backup triggered');
    await this.runBackup().catch((err: Error) => {
      this.logger.error(`Scheduled backup error: ${err.message}`, err.stack);
    });
  }

  async runBackup(): Promise<BackupStatus> {
    const startedAt = new Date();
    this.logger.log('Starting backup run...');

    await this.runPostgresBackup(startedAt);
    await this.backupMinio();
    await this.backupKeycloak();

    return this.getStatus();
  }

  private async runPostgresBackup(startedAt: Date): Promise<void> {
    this.logger.log('Starting PostgreSQL backup...');

    const scriptPath = this.resolveScriptPath();

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      BACKUP_DIR: process.env.BACKUP_DIR ?? '/backups/postgresql',
    };

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
        timeout: 10 * 60 * 1000,
      });

      if (stdout) this.logger.log(`Backup output:\n${stdout.trim()}`);
      if (stderr) this.logger.warn(`Backup stderr:\n${stderr.trim()}`);

      const match = stdout.match(/Backup created:\s*(\S+)/);
      this.lastBackupFile = match ? match[1] : null;
      this.lastRunAt = startedAt;
      this.lastRunStatus = 'success';
      this.lastErrorMessage = null;

      this.logger.log(`PostgreSQL backup completed successfully at ${startedAt.toISOString()}`);
    } catch (err: any) {
      this.lastRunAt = startedAt;
      this.lastRunStatus = 'failure';
      this.lastErrorMessage = err.message?.substring(0, 500) ?? 'Unknown error';
      this.logger.error(`PostgreSQL backup failed: ${this.lastErrorMessage}`, err.stack);
    }
  }

  private async backupMinio(): Promise<void> {
    const endpoint = process.env.S3_ENDPOINT ?? 'http://opengrade-minio:9000';
    const user = process.env.MINIO_ROOT_USER ?? 'minioadmin';
    const pass = process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin';
    const bucket = process.env.S3_BUCKET ?? 'opengrade';
    const backupDir = process.env.BACKUP_DIR ?? '/backups';

    const mcPath = '/usr/local/bin/mc';
    const cmd = `${mcPath} alias set backup ${endpoint} ${user} ${pass} && ${mcPath} mirror backup/${bucket} ${backupDir}/minio/${bucket}`;

    try {
      await execAsync(cmd);
      this.logger.log('MinIO backup completed');
    } catch (err: any) {
      this.logger.warn(`MinIO backup skipped (mc not available): ${err.message}`);
    }
  }

  private async backupKeycloak(): Promise<void> {
    const kcUrl = process.env.KEYCLOAK_URL ?? 'http://opengrade-keycloak:8080/auth';
    const realm = process.env.KEYCLOAK_REALM ?? 'opengrade';
    const adminUser = process.env.KEYCLOAK_ADMIN ?? 'admin';
    const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD ?? '';
    const backupDir = process.env.BACKUP_DIR ?? '/backups';

    try {
      const tokenRes = await fetch(`${kcUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPass,
        }),
      });
      if (!tokenRes.ok) throw new Error(`Failed to get admin token: ${tokenRes.status}`);
      const { access_token } = await tokenRes.json() as { access_token: string };

      const exportRes = await fetch(
        `${kcUrl}/admin/realms/${realm}/partial-export?exportClients=true&exportGroupsAndRoles=true`,
        { headers: { Authorization: `Bearer ${access_token}` } },
      );
      if (!exportRes.ok) throw new Error(`Realm export failed: ${exportRes.status}`);
      const realmData = await exportRes.text();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fsp.mkdir(`${backupDir}/keycloak`, { recursive: true });
      await fsp.writeFile(`${backupDir}/keycloak/realm-${timestamp}.json`, realmData);
      this.logger.log('Keycloak realm export completed');
    } catch (err: any) {
      this.logger.warn(`Keycloak backup skipped: ${err.message}`);
    }
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
    next.setHours(2, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  private resolveScriptPath(): string {
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

    return candidates[1] as string;
  }
}
