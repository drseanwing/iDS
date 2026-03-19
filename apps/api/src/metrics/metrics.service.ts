import { Injectable } from '@nestjs/common';

/**
 * In-memory Prometheus-compatible metrics service.
 * No external packages required.
 */
@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  /**
   * Increment a counter metric.
   */
  increment(name: string, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  /**
   * Record a value for a histogram metric (e.g. request duration in ms).
   */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    const existing = this.histograms.get(key);
    if (existing) {
      existing.push(value);
    } else {
      this.histograms.set(key, [value]);
    }
  }

  /**
   * Emit all metrics in Prometheus text exposition format.
   */
  getMetrics(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters) {
      const { name, labelStr } = this.parseKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labelStr} ${value}`);
    }

    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;
      const { name, labelStr } = this.parseKey(key);
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const p50 = this.percentile(sorted, 0.5);
      const p95 = this.percentile(sorted, 0.95);
      const p99 = this.percentile(sorted, 0.99);

      const baseLabels = labelStr.slice(0, -1); // strip trailing }
      const hasLabels = baseLabels.length > 1; // more than just {

      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_sum${labelStr} ${sum}`);
      lines.push(`${name}_count${labelStr} ${count}`);
      lines.push(
        `${name}_p50${hasLabels ? baseLabels + '} ' : ' '}${p50}`,
      );
      lines.push(
        `${name}_p95${hasLabels ? baseLabels + '} ' : ' '}${p95}`,
      );
      lines.push(
        `${name}_p99${hasLabels ? baseLabels + '} ' : ' '}${p99}`,
      );
    }

    return lines.join('\n') + '\n';
  }

  /**
   * Normalize a URL path by replacing UUID-like segments with :id.
   * e.g. /guidelines/abc-123-def/sections -> /guidelines/:id/sections
   */
  static normalizePath(path: string): string {
    return path
      // UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      // Numeric IDs
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }

  private buildKey(name: string, labels: Record<string, string>): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) return `${name}{}`;
    const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
  }

  private parseKey(key: string): { name: string; labelStr: string } {
    const braceIdx = key.indexOf('{');
    if (braceIdx === -1) return { name: key, labelStr: '' };
    const name = key.slice(0, braceIdx);
    const labelStr = key.slice(braceIdx);
    // labelStr is "{...}" or "{}"
    return { name, labelStr: labelStr === '{}' ? '' : labelStr };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
  }
}
