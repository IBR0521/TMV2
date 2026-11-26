import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * design/KIT.md says the token values come from design/tokens.json. The kit
 * declares them in src/ui/theme.css, so this is what keeps that statement true:
 * if either file is edited without the other, this fails.
 */
const root = process.cwd();

function themeTokens(prefix: string): Record<string, string> {
  const css = readFileSync(join(root, 'src/ui/theme.css'), 'utf8');
  const block = css.split('@theme {')[1]!.split('\n}')[0]!;
  const out: Record<string, string> = {};
  const pattern = new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g');
  for (const match of block.matchAll(pattern)) {
    const [, name, value] = match;
    if (name === '*' || value!.trim() === 'initial') continue;
    out[name!] = value!.trim();
  }
  return out;
}

const file = JSON.parse(readFileSync(join(root, 'design/tokens.json'), 'utf8')) as {
  color: Record<string, string>;
  radius: Record<string, string>;
  font: Record<string, string>;
};

describe('design/tokens.json', () => {
  it('lists exactly the colours theme.css declares', () => {
    expect(file.color).toEqual(themeTokens('color'));
  });

  it('lists exactly the radii theme.css declares', () => {
    expect(file.radius).toEqual(themeTokens('radius'));
  });

  it('lists exactly the font stacks theme.css declares', () => {
    expect(file.font).toEqual(themeTokens('font'));
  });

  it('still carries the approved blue and the one warning orange', () => {
    expect(file.color.primary).toBe('#1767d2');
    expect(file.color.warning).toBe('#e5a13a');
  });
});
