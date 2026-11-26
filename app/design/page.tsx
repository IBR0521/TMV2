import Link from 'next/link';

const PROPOSAL = {
  href: '/design/e',
  name: 'Manifest',
  thesis: 'A dispatch sheet, not a dashboard: ruled lines, placards and stencilled figures, with the fleet across the top.',
  points: [
    'Archivo, an American grotesque drawn for print and signage, instead of the typeface every template ships with.',
    'No left sidebar: the fleet runs across the top as six ruled cells with unit placards, a word for what each truck is doing and how far through the run it is.',
    'The inbox is a ruled manifest — tick, subject, field name in wide caps, facts, amount right-aligned in mono, one action.',
    'A door placard for a mark, and a masthead that reads like the head of a document: carrier, power units, MC number.',
    'Money as a column of figures with a rule under each whose length is its share of the week.',
  ],
};

const REJECTED = [
  { href: '/design/d', name: 'Night haul', note: 'Correct mechanics, no point of view: the default dark shell.' },
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
