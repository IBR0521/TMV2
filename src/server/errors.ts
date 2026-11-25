/**
 * The errors the action wrapper knows how to show a person. Anything else is
 * logged to Sentry and shown as "something went wrong", so a database message
 * never reaches the browser.
 */
export class NotSignedInError extends Error {
  constructor() {
    super('Sign in to continue.');
    this.name = 'NotSignedInError';
  }
}

export class NoCompanyError extends Error {
  constructor() {
    super('This account does not belong to a company yet.');
    this.name = 'NoCompanyError';
  }
}

/** A problem the person can read and act on. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionError';
  }
}
