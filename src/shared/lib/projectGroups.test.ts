import { describe, expect, it } from 'vitest';
import { projectGroupOf } from './projectGroups';

// Same cases as the site's src/lib/projectGroups.test.ts, so the two copies stay in step.
describe('projectGroupOf', () => {
  it('uses the stored group, else infers it', () => {
    expect(projectGroupOf({ group: 'client', role: 'Founder' })).toBe('client');
    expect(projectGroupOf({ role: 'Co-founder & engineer', category: 'Websites', client: 'X' })).toBe('venture');
    expect(projectGroupOf({ role: 'Student', category: 'University', client: 'IIT' })).toBe('academic');
    expect(projectGroupOf({ role: 'Lead engineer', category: 'AI', client: 'Acme' })).toBe('lab');
    expect(projectGroupOf({ role: 'Developer', category: 'SaaS & Platforms' })).toBe('lab');
    expect(projectGroupOf({ role: 'Web developer', category: 'Websites', client: 'Blends' })).toBe('client');
    expect(projectGroupOf({ group: '', role: 'Web developer', category: 'Websites', client: 'A' })).toBe('client');
  });
});
