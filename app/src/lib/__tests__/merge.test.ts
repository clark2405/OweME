import { describe, expect, it } from '@jest/globals';
import { mergeById } from '../merge';

type Row = { id: string; updatedAt?: string; v?: string };

describe('mergeById', () => {
  it('keeps cloud-only rows and does not mark them to push', () => {
    const { merged, fromLocal } = mergeById<Row>([], [{ id: 'a', updatedAt: '2026-01-01' }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('a');
    expect(fromLocal).toHaveLength(0);
  });

  it('adds local-only rows and marks them to push', () => {
    const { merged, fromLocal } = mergeById<Row>([{ id: 'a', updatedAt: '2026-01-01' }], []);
    expect(merged.map((r) => r.id)).toEqual(['a']);
    expect(fromLocal.map((r) => r.id)).toEqual(['a']);
  });

  it('unions both sides by id', () => {
    const { merged } = mergeById<Row>(
      [{ id: 'a', updatedAt: '1' }],
      [{ id: 'b', updatedAt: '1' }],
    );
    expect(new Set(merged.map((r) => r.id))).toEqual(new Set(['a', 'b']));
  });

  it('on conflict, the newer updatedAt wins (local newer)', () => {
    const { merged, fromLocal } = mergeById<Row>(
      [{ id: 'a', updatedAt: '2026-02-01', v: 'local' }],
      [{ id: 'a', updatedAt: '2026-01-01', v: 'cloud' }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].v).toBe('local');
    expect(fromLocal.map((r) => r.id)).toEqual(['a']);
  });

  it('on conflict, the newer updatedAt wins (cloud newer) and local is NOT pushed', () => {
    const { merged, fromLocal } = mergeById<Row>(
      [{ id: 'a', updatedAt: '2026-01-01', v: 'local' }],
      [{ id: 'a', updatedAt: '2026-02-01', v: 'cloud' }],
    );
    expect(merged[0].v).toBe('cloud');
    expect(fromLocal).toHaveLength(0);
  });

  it('breaks an exact tie in favour of local (and pushes it)', () => {
    const { merged, fromLocal } = mergeById<Row>(
      [{ id: 'a', updatedAt: '2026-01-01', v: 'local' }],
      [{ id: 'a', updatedAt: '2026-01-01', v: 'cloud' }],
    );
    expect(merged[0].v).toBe('local');
    expect(fromLocal).toHaveLength(1);
  });

  it('treats a missing local updatedAt as oldest (cloud with a stamp wins)', () => {
    const { merged, fromLocal } = mergeById<Row>(
      [{ id: 'a', v: 'local' }],
      [{ id: 'a', updatedAt: '2026-01-01', v: 'cloud' }],
    );
    expect(merged[0].v).toBe('cloud');
    expect(fromLocal).toHaveLength(0);
  });

  it('when both lack updatedAt, local wins (tie on empty)', () => {
    const { merged, fromLocal } = mergeById<Row>(
      [{ id: 'a', v: 'local' }],
      [{ id: 'a', v: 'cloud' }],
    );
    expect(merged[0].v).toBe('local');
    expect(fromLocal).toHaveLength(1);
  });

  it('handles two empty inputs', () => {
    const { merged, fromLocal } = mergeById<Row>([], []);
    expect(merged).toHaveLength(0);
    expect(fromLocal).toHaveLength(0);
  });
});
