import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';

// Mock child_process at module level so execAsync (created via promisify(exec)
// at module load time) can be controlled per-test.
jest.mock('child_process', () => ({ exec: jest.fn() }));

describe('BackupService', () => {
  let service: BackupService;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let mockExec: jest.Mock;

  beforeEach(async () => {
    // Retrieve the mocked exec after jest.mock hoisting
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mockExec = require('child_process').exec as jest.Mock;
    mockExec.mockReset();

    // Stub fs.existsSync so resolveScriptPath returns a stable candidate path
    jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [BackupService],
    }).compile();

    service = module.get<BackupService>(BackupService);

    // Prevent the real scheduler from firing during tests
    jest.spyOn(service as any, 'startScheduler').mockImplementation(() => {});
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
      // The mocked exec lacks the promisify.custom symbol, so promisify resolves
      // with the single result arg. The service destructures { stdout, stderr } from it.
      mockExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
        cb(null, { stdout: 'Backup created: /backups/pg-2024.sql.gz', stderr: '' });
      });

      await service.runBackup();

      const status = service.getStatus();
      expect(status.lastRunStatus).toBe('success');
      expect(status.lastRunAt).toBeInstanceOf(Date);
      expect(status.lastBackupFile).toBe('/backups/pg-2024.sql.gz');
    });
  });

  describe('runBackup', () => {
    it('initiates a backup and returns success status', async () => {
      mockExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
        cb(null, { stdout: 'Backup created: /backups/dump.sql.gz', stderr: '' });
      });

      const result = await service.runBackup();

      expect(result.lastRunStatus).toBe('success');
      expect(result.lastBackupFile).toBe('/backups/dump.sql.gz');
    });

    it('handles backup command failure gracefully without throwing', async () => {
      mockExec.mockImplementation((_cmd: any, _opts: any, cb: any) => {
        cb(new Error('pg_dump: connection refused'), '', '');
      });

      // Should NOT propagate — failure is captured in returned status
      const result = await service.runBackup();

      expect(result.lastRunStatus).toBe('failure');
      expect(result.lastErrorMessage).toContain('pg_dump: connection refused');
      expect(result.lastBackupFile).toBeNull();
    });
  });
});
