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

  it('takes the app from a "Streamlit App" badge, not an API key page', () => {
    const readme = [
      '[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/a/b)',
      '[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://llm-examples.streamlit.app/)',
      '1. Go to https://platform.openai.com/account/api-keys.',
    ].join('\n');
    expect(siteFromReadme(readme)).toBe('https://llm-examples.streamlit.app/');
  });

  it('never picks a provider dashboard or key page', () => {
    expect(siteFromReadme('Get a key at https://console.anthropic.com/settings/keys')).toBeNull();
    expect(siteFromReadme('Create one at https://example.com/account/api-keys')).toBeNull();
  });
});
