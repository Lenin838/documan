import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { GovernanceBanner } from './GovernanceBanner';

describe('GovernanceBanner component', () => {
  it('renders title cleanly', () => {
    const html = renderToString(<GovernanceBanner title="Release Certificate Audit" />);
    expect(html).toContain('Release Certificate Audit');
    expect(html).toContain('<section');
    expect(html).toContain('aria-label="Release Certificate Audit"');
  });

  it('renders snapshot mode with T_cert badge and solid border styling', () => {
    const html = renderToString(
      <GovernanceBanner title="Snapshot Lineage" mode="snapshot" />
    );
    expect(html).toContain('Snapshot Lineage');
    expect(html).toContain('T_cert');
    expect(html).toContain('border-solid');
    expect(html).toContain('bg-[var(--color-cert-snapshot-bg,rgba(88,28,135,0.6))]');
  });

  it('renders drift mode with T_now badge and dashed border styling', () => {
    const html = renderToString(
      <GovernanceBanner title="Live Drift Audit" mode="drift" />
    );
    expect(html).toContain('Live Drift Audit');
    expect(html).toContain('T_now');
    expect(html).toContain('border-dashed');
    expect(html).toContain('bg-[var(--color-drift-live-bg,rgba(12,74,110,0.6))]');
  });

  it('renders default, info, warning, and error modes correctly', () => {
    const defaultHtml = renderToString(<GovernanceBanner title="Default Banner" mode="default" />);
    expect(defaultHtml).toContain('Default Banner');

    const infoHtml = renderToString(<GovernanceBanner title="Info Banner" mode="info" />);
    expect(infoHtml).toContain('Info Banner');

    const warningHtml = renderToString(<GovernanceBanner title="Warning Banner" mode="warning" />);
    expect(warningHtml).toContain('Warning Banner');

    const errorHtml = renderToString(<GovernanceBanner title="Error Banner" mode="error" />);
    expect(errorHtml).toContain('Error Banner');
  });

  it('renders description, status badge, metadata, and action elements', () => {
    const html = renderToString(
      <GovernanceBanner
        title="Comprehensive Audit Header"
        mode="drift"
        statusBadge={<span className="status-badge">FULLY COMPLIANT</span>}
        description={<p className="desc">Active production environment target.</p>}
        metadata={[
          { label: 'Cert Status', value: 'ACTIVE' },
          { label: 'Live Readiness', value: 'PASSED' },
        ]}
        actions={
          <button type="button" className="btn-export">
            Export JSON
          </button>
        }
        className="custom-banner-class"
      />
    );

    expect(html).toContain('Comprehensive Audit Header');
    expect(html).toContain('FULLY COMPLIANT');
    expect(html).toContain('Active production environment target.');
    expect(html).toContain('Cert Status');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Live Readiness');
    expect(html).toContain('PASSED');
    expect(html).toContain('Export JSON');
    expect(html).toContain('custom-banner-class');
  });

  it('provides accessible section landmark and h2 heading structure', () => {
    const html = renderToString(
      <GovernanceBanner title="Accessible Banner" mode="snapshot" />
    );
    expect(html).toContain('aria-label="Accessible Banner"');
    expect(html).toContain('<h2');
    expect(html).toContain('Accessible Banner</h2>');
  });
});
