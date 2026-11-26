'use server';

import { z } from 'zod';
import { normaliseDotNumber } from '@/domain/customers';
import { sessionAction } from '../action';
import { ActionError } from '../errors';
import * as fmcsa from '../services/fmcsa';

/**
 * Looking a carrier up by USDOT number.
 *
 * sessionAction, not action: this is used at signup, before the account
 * belongs to any company, so there is no role to check. It reads public
 * federal data and touches nothing of the carrier's own, and the input is one
 * number — there is nothing here that a company could scope.
 */
export const lookUpCarrier = sessionAction(
  z.object({
    dotNumber: z
      .string()
      .trim()
      .min(1, 'Enter a USDOT number.')
      .refine((raw) => normaliseDotNumber(raw) !== null, 'A USDOT number is up to 8 digits.'),
  }),
  async (_session, input) => {
    const dotNumber = normaliseDotNumber(input.dotNumber);
    if (dotNumber === null) throw new ActionError('A USDOT number is up to 8 digits.');

    const carrier = await fmcsa.lookUpDot(dotNumber);
    if (carrier === null) {
      throw new ActionError(
        `No carrier is registered under USDOT ${dotNumber}. Type the details in instead.`,
      );
    }

    return { carrier };
  },
);
