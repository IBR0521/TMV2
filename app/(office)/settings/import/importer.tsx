'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  type Column,
  DataTable,
  EmptyState,
  Field,
  FormActions,
  FormGrid,
  Input,
  Panel,
  PanelHeader,
  Select,
  StatusChip,
} from '@/ui';
import { readCsv, type Sheet } from '@/domain/csv';
import {
  IMPORT_KINDS,
  type ImportKind,
  fieldsFor,
  isImportable,
  matchColumns,
  parseRow,
} from '@/domain/spreadsheet';
import { useHydrated } from '@/client/use-hydrated';
import { importSheet, rememberedColumns } from '@/server/actions/imports';

/**
 * Spreadsheet import (docs/spec/screens.md, row 29; build plan phase 2 step 5).
 *
 * The file is read in the browser and never uploaded: a carrier's fleet list
 * is their business, and there is no reason for a copy of it to sit in storage
 * to import twenty rows. What the server receives is the cells and the column
 * choices, and it re-reads them with the same pure functions this preview
 * used — so the preview is honest and the server is still the authority.
 *
 * Nothing is written until the preview is accepted, which is the whole point
 * of showing one.
 */
const KIND_LABELS: Record<ImportKind, string> = {
  trucks: 'Trucks',
  drivers: 'Drivers',
  customers: 'Customers',
};

const PREVIEW_ROWS = 12;
const IGNORE = '';

type PreviewRow = {
  id: string;
  line: number;
  cells: Record<string, string>;
  values: Record<string, string | number>;
  problem: string | null;
};

type Outcome = { created: number; skipped: number; problems: { line: number; what: string }[] };

export function Importer() {
  const router = useRouter();
  const ready = useHydrated();
  const [pending, startTransition] = useTransition();

  const [kind, setKind] = useState<ImportKind>('trucks');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const fields = fieldsFor(kind);

  async function readFile(file: File, forKind: ImportKind) {
    setError(null);
    setOutcome(null);
    setFileName(file.name);

    try {
      let read: Sheet;

      if (file.name.toLowerCase().endsWith('.csv')) {
        read = readCsv(await file.text());
      } else {
        // Only loaded when somebody actually opens a spreadsheet, so a reader
        // for a format most people will not use stays out of everyone's page.
        // The browser entry point: this never runs on the server, and the
        // package has no root export. readSheet gives the first worksheet's
        // rows; the default export gives every worksheet, which is not what a
        // fleet list needs.
        const { readSheet } = await import('read-excel-file/browser');
        const rows = await readSheet(file);
        const { toSheet } = await import('@/domain/csv');
        read = toSheet(
          rows.map((row) =>
            row.map((cell) =>
              cell === null || cell === undefined
                ? ''
                : cell instanceof Date
                  ? cell.toISOString().slice(0, 10)
                  : String(cell),
            ),
          ),
        );
      }

      if (read.headings.length === 0 || read.rows.length === 0) {
        setSheet(null);
        setError('That file has no rows in it.');
        return;
      }

      const remembered = await rememberedColumns({ kind: forKind });
      const match = matchColumns(
        read.headings,
        forKind,
        remembered.ok ? remembered.data.mapping : {},
      );

      setSheet(read);
      setMapping(match.mapping);
    } catch {
      setSheet(null);
      setError('That file could not be read. A CSV or an .xlsx export works best.');
    }
  }

  function changeKind(next: ImportKind) {
    setKind(next);
    setSheet(null);
    setFileName(null);
    setMapping({});
    setOutcome(null);
    setError(null);
  }

  function setColumn(heading: string, field: string) {
    setMapping((current) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries(current)) {
        // A field belongs to one column: giving it to this one takes it from
        // whichever had it.
        if (key !== heading && value !== field) next[key] = value;
      }
      if (field !== IGNORE) next[heading] = field;
      return next;
    });
  }

  const preview: PreviewRow[] =
    sheet === null
      ? []
      : sheet.rows.map((cells, index) => {
          const parsed = parseRow(cells, mapping, kind);
          return {
            id: `row-${index}`,
            line: index + 2,
            cells,
            values: parsed.values,
            problem: isImportable(parsed)
              ? null
              : parsed.problems
                  .map((problem) => `${problem.label} ${problem.message}`)
                  .join(', '),
          };
        });

  const ok = preview.filter((row) => row.problem === null).length;
  const bad = preview.length - ok;

  const columns: Column<PreviewRow>[] = [
    { key: 'line', header: 'Line', render: (row) => String(row.line) },
    ...fields.map((spec) => ({
      key: spec.field,
      header: spec.label,
      render: (row: PreviewRow) => {
        const value = row.values[spec.field];
        return value === undefined ? '—' : String(value);
      },
    })),
    {
      key: 'problem',
      header: 'Reads as',
      align: 'right' as const,
      render: (row: PreviewRow) =>
        row.problem === null ? (
          <StatusChip tone="idle">Ready</StatusChip>
        ) : (
          <StatusChip tone="warning" dot>
            {row.problem}
          </StatusChip>
        ),
    },
  ];

  function run() {
    if (sheet === null) return;
    setError(null);

    startTransition(async () => {
      const result = await importSheet({ kind, mapping, rows: sheet.rows });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOutcome(result.data);
      setSheet(null);
      setFileName(null);
      router.refresh();
    });
  }

  return (
    <>
      <Panel label="Import a spreadsheet">
        <PanelHeader title="Import a spreadsheet" />

        <FormGrid>
          <Field label="What is in the file">
            <Select
              value={kind}
              aria-label="What is in the file"
              onChange={(event) => changeKind(event.target.value as ImportKind)}
            >
              {IMPORT_KINDS.map((value) => (
                <option key={value} value={value}>
                  {KIND_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="The file"
            hint={fileName ?? 'A CSV or .xlsx export. It is read here and never uploaded.'}
            error={error ?? undefined}
          >
            {/* The kit's Input, so the guard and the page agree: CLAUDE.md
                allows a raw file input, scripts/check-ui.mjs does not, and
                the guard is the owner's to change, not mine. */}
            <Input
              type="file"
              accept=".csv,.xlsx,text/csv"
              aria-label="Spreadsheet to import"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readFile(file, kind);
              }}
            />
          </Field>
        </FormGrid>
      </Panel>

      {outcome === null ? null : (
        <Panel label="Imported">
          <PanelHeader title="Imported" />
          <EmptyState
            title={`${outcome.created} ${outcome.created === 1 ? 'row' : 'rows'} added`}
            hint={
              [
                outcome.skipped === 0 ? null : `${outcome.skipped} already on the list`,
                outcome.problems.length === 0
                  ? null
                  : `${outcome.problems.length} could not be read: line ${outcome.problems
                      .slice(0, 5)
                      .map((problem) => problem.line)
                      .join(', ')}`,
              ]
                .filter((part): part is string => part !== null)
                .join(' · ') || 'Everything in the file went in.'
            }
          />
        </Panel>
      )}

      {sheet === null ? null : (
        <>
          <Panel label="Which column is which">
            <PanelHeader title="Which column is which" count={sheet.headings.length} />
            <FormGrid columns={3}>
              {sheet.headings.map((heading) => (
                <Field key={heading} label={heading}>
                  <Select
                    value={mapping[heading] ?? IGNORE}
                    aria-label={`What ${heading} is`}
                    onChange={(event) => setColumn(heading, event.target.value)}
                  >
                    <option value={IGNORE}>Ignore this column</option>
                    {fields.map((spec) => (
                      <option key={spec.field} value={spec.field}>
                        {spec.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </FormGrid>
          </Panel>

          <Panel label="Preview">
            <PanelHeader
              title="Preview"
              count={
                bad === 0 ? `${ok} ready` : `${ok} ready · ${bad} to fix`
              }
            />
            <DataTable
              columns={columns}
              rows={preview.slice(0, PREVIEW_ROWS)}
              rowKey={(row) => row.id}
            />
            <FormActions>
              <Button onClick={() => changeKind(kind)}>Choose another file</Button>
              <Button variant="primary" disabled={pending || !ready || ok === 0} onClick={run}>
                {pending
                  ? 'Importing'
                  : `Import ${ok} ${ok === 1 ? KIND_LABELS[kind].slice(0, -1).toLowerCase() : KIND_LABELS[kind].toLowerCase()}`}
              </Button>
            </FormActions>
          </Panel>
        </>
      )}
    </>
  );
}
