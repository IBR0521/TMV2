'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { action } from '../action';
import * as suggestions from '../services/suggestions';

const card = z.object({ suggestionId: z.uuid() });

export const dismissSuggestion = action(
  card,
  ['owner', 'dispatcher', 'accounting'],
  async (ctx, input) => {
    await suggestions.dismiss(ctx, input.suggestionId);
    revalidatePath('/today');
    return { dismissed: true };
  },
);

export const acceptSuggestion = action(
  card,
  ['owner', 'dispatcher', 'accounting'],
  async (ctx, input) => {
    await suggestions.accept(ctx, input.suggestionId);
    revalidatePath('/today');
    return { accepted: true };
  },
);
