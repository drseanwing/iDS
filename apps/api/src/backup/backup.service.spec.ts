import { Test, TestingModule } from '@nestjs/testing';
import * as childProcess from 'child_process';
import { BackupService } from './backup.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupService],
    }).compile();

    service = module.get<BackupService>(BackupService);

    // Prevent the real scheduler from starting during tests
    jest.spyOn(service as any, 'startScheduler').mockImplementation(() => {});

    // Stub fs.existsSync so resolveScriptPath returns a stable candidate path
    jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('returns backup status with initial "never" state', () => {
      const status = service.getStatus();

      expect(status.lastRunStatus).toBe('never');
      expect(status.lastRunAt).toBeNull();
      expect(status.lastBackupFile).toBeNull();
      expect(status.lastErrorMessage).toBeNull();
      expect(status.nextScheduledAt).toBeInstanceOf(Date);
    });

    it('returns last backup date after a successful run', async () => {
      // execAsync is created via promisify(exec) at module level; spy on exec directly
      // and simulate the callback form that promisify wraps.
      jest.spyOn(childProcess, 'exec').mockImplementation(
        ((_cmd: any, _opts: any, cb: any) => {
          cb(null, 'Backup created: /backups/pg-2024.sql.gz', '');
        }) as any,
      );

      await service.runBackup();

      const status = service.getStatus();
      expect(status.lastRunStatus).toBe('success');
      expect(status.lastRunAt).toBeInstanceOf(Date);
      expect(status.lastBackupFile).toBe('/backups/pg-2024.sql.gz');
    });
  });

  describe('runBackup (triggerBackup)', () => {
    it('initiates a backup and returns success status', async () => {
      jest.spyOn(childProcess, 'exec').mockImplementation(
        ((_cmd: any, _opts: any, cb: any) => {
          cb(null, 'Backup created: /backups/dump.sql.gz', '');
        }) as any,
      );

      const result = await service.runBackup();

      expect(result.lastRunStatus).toBe('success');
      expect(result.lastBackupFile).toBe('/backups/dump.sql.gz');
    });

    it('handles backup command failure gracefully', async () => {
      const error = new Error('pg_dump: connection refused');
      jest.spyOn(childProcess, 'exec').mockImplementation(
        ((_cmd: any, _opts: any, cb: any) => {
          cb(error, '', '');
        }) as any,
      );

      // Should NOT throw — failure is captured in status
      const result = await service.runBackup();

      expect(result.lastRunStatus).toBe('failure');
      expect(result.lastErrorMessage).toContain('pg_dump: connection refused');
      expect(result.lastBackupFile).toBeNull();
    });
  });
});
