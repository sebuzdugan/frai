import { describe, expect, it } from 'vitest';
import { siteFromReadme } from './review.js';

describe('the site a README points to', () => {
  it('skips badges, deploy buttons, dev environments and social posts', () => {
    const readme = [
      '[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=x)',
      '[![Open in Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/streamlit/llm-examples)',
      'Follow updates on https://x.com/mckaywrigley/status/123',
      'Docs: https://github.com/vercel/ai-chatbot',
    ].join('\n');
    expect(siteFromReadme(readme)).toBeNull();
  });

  it('prefers the line that says demo or website', () => {
    const readme = 'Built with https://nextjs.org.\n\nLive demo: https://chat.vercel.ai/\n';
    expect(siteFromReadme(readme)).toBe('https://chat.vercel.ai/');
  });

  it('ignores links in comments and images', () => {
    expect(siteFromReadme('<!-- https://old.example.com -->\n![logo](https://cdn.example.com/logo.png)')).toBeNull();
  });
});
