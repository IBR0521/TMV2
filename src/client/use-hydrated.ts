'use client';

import { useSyncExternalStore } from 'react';

/**
 * False until React has taken over the markup in the browser.
 *
 * Every form here needs JavaScript: signing in talks to Supabase from the
 * browser, and the carrier form calls a server action. Before hydration a
 * submit button is still a submit button, and the browser would send the form
 * the plain HTML way — which for a sign-in form means putting the password in
 * the address bar. Disabling the button until this is true makes that
 * impossible, and it also stops someone pressing Enter into a dead form.
 */
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(noop, onClient, onServer);
}
