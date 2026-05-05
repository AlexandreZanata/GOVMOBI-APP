import {resolvePublicMediaUrl} from '../resolvePublicMediaUrl';

describe('resolvePublicMediaUrl', () => {
  it('returns undefined for empty input', () => {
    expect(resolvePublicMediaUrl(undefined, 'http://10.0.0.1:3000')).toBeUndefined();
    expect(resolvePublicMediaUrl('  ', 'http://10.0.0.1:3000')).toBeUndefined();
  });

  it('rewrites localhost to API origin', () => {
    expect(
      resolvePublicMediaUrl(
        'http://localhost:3000/uploads/a.webp',
        'http://172.19.2.116:3000',
      ),
    ).toBe('http://172.19.2.116:3000/uploads/a.webp');
  });

  it('leaves non-loopback URLs unchanged', () => {
    const u = 'http://172.19.2.116:3000/uploads/a.webp';
    expect(resolvePublicMediaUrl(u, 'http://172.19.2.116:3000')).toBe(u);
  });
});
