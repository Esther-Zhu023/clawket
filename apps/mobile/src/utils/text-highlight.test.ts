import { splitHighlightSegments } from './text-highlight';

describe('splitHighlightSegments', () => {
  it('returns full text as non-match when query is empty', () => {
    expect(splitHighlightSegments('hello world', '')).toEqual([
      { text: 'hello world', match: false },
    ]);
  });

  it('splits text into case-insensitive match segments', () => {
    expect(splitHighlightSegments('Alpha beta ALPHA', 'alpha')).toEqual([
      { text: 'Alpha', match: true },
      { text: ' beta ', match: false },
      { text: 'ALPHA', match: true },
    ]);
  });

  it('handles repeated non-overlapping matches', () => {
    expect(splitHighlightSegments('aaaa', 'aa')).toEqual([
      { text: 'aa', match: true },
      { text: 'aa', match: true },
    ]);
  });

  it('does not treat regex characters specially', () => {
    expect(splitHighlightSegments('a+b a+b', 'a+b')).toEqual([
      { text: 'a+b', match: true },
      { text: ' ', match: false },
      { text: 'a+b', match: true },
    ]);
  });
});

