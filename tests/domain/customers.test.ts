import { describe, expect, it } from 'vitest';
import {
  customerTypeLabel,
  isPaymentTerms,
  normaliseDotNumber,
  normaliseEmail,
  normaliseMcNumber,
  paymentTermsLabel,
  sendModeLabel,
} from '@/domain/customers';

describe('payment terms', () => {
  it('are written the way the industry writes them', () => {
    expect(paymentTermsLabel(30)).toBe('Net 30');
    expect(paymentTermsLabel(45)).toBe('Net 45');
  });

  it('say so plainly when there are none', () => {
    expect(paymentTermsLabel(0)).toBe('Due on receipt');
  });

  it('stop at half a year, because beyond that it is a typo', () => {
    expect(isPaymentTerms(180)).toBe(true);
    expect(isPaymentTerms(181)).toBe(false);
    expect(isPaymentTerms(-1)).toBe(false);
    expect(isPaymentTerms(30.5)).toBe(false);
  });
});

describe('an MC number', () => {
  it('is the digits, however the carrier wrote it', () => {
    expect(normaliseMcNumber('MC-883102')).toBe('883102');
    expect(normaliseMcNumber('mc 883102')).toBe('883102');
    expect(normaliseMcNumber('883102')).toBe('883102');
  });

  it('is nothing when there is nothing to read', () => {
    expect(normaliseMcNumber('pending')).toBeNull();
    expect(normaliseMcNumber('12')).toBeNull();
  });
});

describe('a DOT number', () => {
  it('is the digits', () => {
    expect(normaliseDotNumber('USDOT 1234567')).toBe('1234567');
    expect(normaliseDotNumber('7')).toBe('7');
  });

  it('is nothing when there is nothing to read', () => {
    expect(normaliseDotNumber('new authority')).toBeNull();
  });
});

describe('a billing email', () => {
  it('is lower case and trimmed', () => {
    expect(normaliseEmail('  AP@Northline.COM ')).toBe('ap@northline.com');
  });

  it('is nothing when it would certainly bounce', () => {
    expect(normaliseEmail('ap@northline')).toBeNull();
    expect(normaliseEmail('two addresses@a.com, b@b.com')).toBeNull();
    expect(normaliseEmail('')).toBeNull();
  });
});

describe('the labels', () => {
  it('name the two kinds of customer', () => {
    expect(customerTypeLabel('broker')).toBe('Broker');
    expect(customerTypeLabel('shipper')).toBe('Shipper');
  });

  it('say what a send mode means rather than naming it', () => {
    expect(sendModeLabel('email')).toBe('We email the invoice');
    expect(sendModeLabel('own_portal')).toBe('They want it in their portal');
  });
});
