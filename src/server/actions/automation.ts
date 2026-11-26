'use server';

import { z } from 'zod';
import { action } from '../action';
import * as automation from '../services/automation';

/**
 * Phase 1 only. Putting a row in automation_test_pings fires the trigger that
 * writes the events row and queues the worker job in one transaction, which is
 * how the whole pipe is checked before loads exist.
 */
export const sendTestPing = action(
  z.object({ note: z.string().trim().max(200).optional().default('Test event') }),
  ['owner', 'dispatcher', 'accounting'],
  async (ctx, input) => {
    const id = await automation.sendTestPing(ctx, input.note);
    return { pingId: id };
  },
);
