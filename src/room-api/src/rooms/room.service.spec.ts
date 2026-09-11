import * as crypto from 'crypto';

function generateSlug(): string {
  return crypto.randomBytes(7).toString('base64url').slice(0, 10);
}

describe('Slug generation', () => {
  it('generates a 10-char URL-safe slug', () => {
    const slug = generateSlug();
    expect(typeof slug).toBe('string');
    expect(slug).toHaveLength(10);
    expect(slug).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('generates unique slugs across 1000 calls', () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      slugs.add(generateSlug());
    }
    expect(slugs.size).toBe(1000);
  });

  it('generates different slugs on consecutive calls', () => {
    const a = generateSlug();
    const b = generateSlug();
    expect(a).not.toBe(b);
  });
});

describe('inviteLink format', () => {
  it('matches expected URL pattern', () => {
    const slug = generateSlug();
    const link = `https://localhost/r/${slug}`;
    expect(link).toMatch(/^https:\/\/localhost\/r\/[a-zA-Z0-9_-]{10}$/);
  });
});
