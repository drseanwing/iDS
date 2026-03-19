import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('increment', () => {
    it('should start counter at 1 on first call', () => {
      service.increment('http_requests_total', { method: 'GET', path: '/health' });
      const output = service.getMetrics();
      expect(output).toContain('http_requests_total');
      expect(output).toContain('1');
    });

    it('should accumulate counter on repeated calls', () => {
      service.increment('api_calls', { endpoint: '/test' });
      service.increment('api_calls', { endpoint: '/test' });
      service.increment('api_calls', { endpoint: '/test' });
      const output = service.getMetrics();
      expect(output).toMatch(/api_calls.*3/);
    });

    it('should track separate counters per label set', () => {
      service.increment('http_requests_total', { method: 'GET' });
      service.increment('http_requests_total', { method: 'GET' });
      service.increment('http_requests_total', { method: 'POST' });
      const output = service.getMetrics();
      // GET appears twice, POST once
      const lines = output.split('\n').filter((l) => l.startsWith('http_requests_total{'));
      expect(lines).toHaveLength(2);
    });

    it('should emit correct Prometheus type line', () => {
      service.increment('my_counter');
      const output = service.getMetrics();
      expect(output).toContain('# TYPE my_counter counter');
    });
  });

  describe('observe', () => {
    it('should record histogram observations', () => {
      service.observe('request_duration_ms', 100, { path: '/api' });
      service.observe('request_duration_ms', 200, { path: '/api' });
      service.observe('request_duration_ms', 300, { path: '/api' });
      const output = service.getMetrics();
      expect(output).toContain('request_duration_ms_sum');
      expect(output).toContain('request_duration_ms_count');
      expect(output).toContain('600'); // sum
      expect(output).toContain('3');   // count
    });

    it('should compute p50, p95, p99 percentiles', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      for (const v of values) {
        service.observe('latency_ms', v);
      }
      const output = service.getMetrics();
      expect(output).toContain('latency_ms_p50');
      expect(output).toContain('latency_ms_p95');
      expect(output).toContain('latency_ms_p99');
    });

    it('should handle single observation', () => {
      service.observe('single_metric', 42);
      const output = service.getMetrics();
      expect(output).toContain('42'); // sum = 42
      expect(output).toContain('1');  // count = 1
    });
  });

  describe('getMetrics', () => {
    it('should return empty-ish string with no metrics recorded', () => {
      const output = service.getMetrics();
      expect(output).toBe('\n');
    });

    it('should return valid Prometheus text format', () => {
      service.increment('requests', { method: 'GET', status: '200' });
      service.observe('duration_ms', 150, { path: '/api/v1' });
      const output = service.getMetrics();

      // Every non-empty line should start with # or metric name
      const lines = output.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        expect(line).toMatch(/^(#|[a-zA-Z_])/);
      }
    });
  });

  describe('normalizePath', () => {
    it('should replace UUIDs with :id', () => {
      const path = '/guidelines/550e8400-e29b-41d4-a716-446655440000/sections';
      expect(MetricsService.normalizePath(path)).toBe('/guidelines/:id/sections');
    });

    it('should replace numeric segments with :id', () => {
      expect(MetricsService.normalizePath('/users/42/posts')).toBe('/users/:id/posts');
    });

    it('should leave non-id paths unchanged', () => {
      expect(MetricsService.normalizePath('/api/v1/health')).toBe('/api/v1/health');
    });

    it('should handle multiple UUIDs in path', () => {
      const path = '/orgs/550e8400-e29b-41d4-a716-446655440000/guidelines/661f9511-f30c-52e5-b827-557766551111';
      expect(MetricsService.normalizePath(path)).toBe('/orgs/:id/guidelines/:id');
    });

    it('should handle path with query string stripped before normalization', () => {
      // Query strings should be stripped by the interceptor before calling normalizePath
      const path = '/api/items/123';
      expect(MetricsService.normalizePath(path)).toBe('/api/items/:id');
    });
  });
});
