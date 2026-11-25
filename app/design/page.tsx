import Link from 'next/link';

const PROPOSAL = {
  href: '/design/d',
  name: 'Night haul',
  thesis: 'Built the way dark software is actually built, with the trade showing in the figures.',
  points: [
    'Depth from surface lightness, not shadows: base, panel, elevated, overlay, each a step lighter.',
    'Hairlines made of light — white at 7% — instead of drawn-on grey, which is what made the first attempt look muddy.',
    'Four text tones used strictly, weight capped at 500, so chrome recedes and content carries.',
    'One saturated colour, sodium amber, for the thing that needs a person. Green and red are state and nothing else.',
    'Lists with no dividers; the hover surface separates them. Figures set in mono, large enough to read across a desk.',
  ],
};

const REJECTED = [
  { href: '/design/a', name: 'Console', note: 'Dense, but the same flat grey panel as the rest.' },
  { href: '/design/b', name: 'Queue', note: 'One decision at a time, in a template.' },
  { href: '/design/c', name: 'Board', note: 'The structure was right, the look was not.' },
];

export default function DesignIndex() {
  return (
    <div className="min-h-screen bg-bg px-6 py-16 text-text">
      <div className="mx-auto max-w-[860px]">
        <h1 className="text-[32px] leading-[38px] font-semibold tracking-[-0.025em]">
          Night haul
        </h1>
        <p className="mt-3 max-w-[64ch] text-body text-text-secondary">{PROPOSAL.thesis}</p>

        <ul className="mt-6 space-y-2">
          {PROPOSAL.points.map((point) => (
            <li key={point} className="max-w-[70ch] text-body text-text-secondary">
              {point}
            </li>
          ))}
        </ul>

        <Link
          href={PROPOSAL.href}
          className="mt-8 inline-flex h-10 items-center rounded-md bg-primary px-5 text-body-strong text-on-primary"
        >
          Open it
        </Link>

        <h2 className="mt-14 text-label text-text-muted">The three that missed</h2>
        <ul className="mt-3 space-y-1">
          {REJECTED.map((r) => (
            <li key={r.href} className="text-body text-text-muted">
              <Link href={r.href} className="text-link hover:underline">
                {r.name}
              </Link>{' '}
              — {r.note}
            </li>
          ))}
        </ul>

        <p className="mt-10 text-label text-text-muted">
          What is built today: <Link href="/today" className="text-link hover:underline">/today</Link>
        </p>
      </div>
    </div>
  );
}
