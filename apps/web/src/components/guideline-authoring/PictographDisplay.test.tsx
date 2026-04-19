import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PictographDisplay } from './PictographDisplay';

describe('PictographDisplay', () => {
  it('renders default labels when none are provided', () => {
    render(<PictographDisplay baselineRisk={0.05} interventionRisk={0.02} />);
    expect(screen.getByText('Without intervention')).toBeDefined();
    expect(screen.getByText('With intervention')).toBeDefined();
  });

  it('uses custom labels when provided', () => {
    render(
      <PictographDisplay
        baselineRisk={0.1}
        interventionRisk={0.05}
        comparatorLabel="Placebo"
        interventionLabel="Drug A"
      />,
    );
    expect(screen.getByText('Placebo')).toBeDefined();
    expect(screen.getByText('Drug A')).toBeDefined();
  });

  it('renders affected counts based on risk and total', () => {
    render(
      <PictographDisplay baselineRisk={0.1} interventionRisk={0.04} total={100} />,
    );
    // 10 of 100 affected for baseline, 4 of 100 for intervention
    expect(screen.getByLabelText('10 of 100 people affected')).toBeDefined();
    expect(screen.getByLabelText('4 of 100 people affected')).toBeDefined();
  });

  it('rounds to nearest whole person', () => {
    render(
      <PictographDisplay baselineRisk={0.055} interventionRisk={0.025} total={100} />,
    );
    expect(screen.getByLabelText('6 of 100 people affected')).toBeDefined();
    expect(screen.getByLabelText('3 of 100 people affected')).toBeDefined();
  });

  it('honours a custom total', () => {
    render(
      <PictographDisplay baselineRisk={0.5} interventionRisk={0.2} total={20} />,
    );
    expect(screen.getByLabelText('10 of 20 people affected')).toBeDefined();
    expect(screen.getByLabelText('4 of 20 people affected')).toBeDefined();
  });
});
