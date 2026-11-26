import { describe, expect, it } from 'vitest';
import { parseCensusMatch } from '../../worker/tasks/geocode-facilities';

/**
 * Reading the US Census geocoder's answer.
 *
 * The one thing worth testing hard: x is longitude and y is latitude, which is
 * the opposite of how everyone says it out loud. Swapping them puts a Dallas
 * dock in the Indian Ocean, and nothing in the app would complain.
 */
const match = (x: number, y: number) => ({
  result: {
    addressMatches: [
      { matchedAddress: '4700 SUNBELT DR, DALLAS, TX, 75236', coordinates: { x, y } },
    ],
  },
});

describe('the geocoder’s answer', () => {
  it('reads x as longitude and y as latitude', () => {
    expect(parseCensusMatch(match(-96.925, 32.701))).toEqual({ lat: 32.701, lng: -96.925 });
  });

  it('is nothing when the address matched nothing', () => {
    expect(parseCensusMatch({ result: { addressMatches: [] } })).toBeNull();
  });

  it('is nothing when the shape is not what we expect', () => {
    expect(parseCensusMatch({})).toBeNull();
    expect(parseCensusMatch(null)).toBeNull();
    expect(parseCensusMatch({ result: {} })).toBeNull();
    expect(parseCensusMatch({ result: { addressMatches: [{}] } })).toBeNull();
    expect(parseCensusMatch({ result: { addressMatches: [{ coordinates: {} }] } })).toBeNull();
  });

  it('refuses coordinates that are not numbers', () => {
    expect(
      parseCensusMatch({
        result: { addressMatches: [{ coordinates: { x: '-96.9', y: '32.7' } }] },
      }),
    ).toBeNull();
  });

  // A geocoder that answers with something impossible is a geocoder having a
  // bad day, not a facility in the sea.
  it('refuses coordinates that are off the earth', () => {
    expect(parseCensusMatch(match(-96.925, 991))).toBeNull();
    expect(parseCensusMatch(match(-999, 32.701))).toBeNull();
    expect(parseCensusMatch(match(Number.NaN, 32.701))).toBeNull();
  });

  it('takes the first match when the geocoder offers several', () => {
    const several = {
      result: {
        addressMatches: [
          { coordinates: { x: -96.925, y: 32.701 } },
          { coordinates: { x: -80, y: 40 } },
        ],
      },
    };

    expect(parseCensusMatch(several)).toEqual({ lat: 32.701, lng: -96.925 });
  });
});
