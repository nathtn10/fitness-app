import {
  hashRecord,
  markPushed,
  maxCursor,
  mergeRemote,
  reconcileLocal,
  type RemoteChange,
  type SyncIndex,
} from '../engine';
import { stripEnvelope, toRemoteChange } from '../mapping';

interface Note {
  id: string;
  text: string;
}

const T1 = '2026-07-01T10:00:00.000Z';
const T2 = '2026-07-01T11:00:00.000Z';
const T3 = '2026-07-01T12:00:00.000Z';

describe('hashRecord', () => {
  it('is stable regardless of key order', () => {
    expect(hashRecord({ a: 1, b: 2 })).toBe(hashRecord({ b: 2, a: 1 }));
  });
  it('changes when content changes', () => {
    expect(hashRecord({ a: 1 })).not.toBe(hashRecord({ a: 2 }));
  });
});

describe('reconcileLocal', () => {
  it('marks brand-new records dirty', () => {
    const { index, dirtyIds } = reconcileLocal<Note>(
      [{ id: 'n1', text: 'hi' }],
      {},
      T1,
    );
    expect(dirtyIds).toEqual(['n1']);
    expect(index.n1.updatedAt).toBe(T1);
    expect(index.n1.syncedAt).toBeUndefined();
  });

  it('does not re-dirty an unchanged, already-synced record', () => {
    let index: SyncIndex = reconcileLocal<Note>([{ id: 'n1', text: 'hi' }], {}, T1).index;
    index = markPushed(index, ['n1']);
    const { dirtyIds } = reconcileLocal<Note>([{ id: 'n1', text: 'hi' }], index, T2);
    expect(dirtyIds).toEqual([]);
  });

  it('re-dirties an edited record with a new timestamp', () => {
    let index = reconcileLocal<Note>([{ id: 'n1', text: 'hi' }], {}, T1).index;
    index = markPushed(index, ['n1']);
    const r = reconcileLocal<Note>([{ id: 'n1', text: 'edited' }], index, T2);
    expect(r.dirtyIds).toEqual(['n1']);
    expect(r.index.n1.updatedAt).toBe(T2);
  });

  it('tombstones a record that disappeared locally', () => {
    let index = reconcileLocal<Note>([{ id: 'n1', text: 'hi' }], {}, T1).index;
    index = markPushed(index, ['n1']);
    const r = reconcileLocal<Note>([], index, T2);
    expect(r.index.n1.deletedAt).toBe(T2);
    expect(r.dirtyIds).toEqual(['n1']); // deletion needs pushing
  });
});

describe('mergeRemote (last-write-wins)', () => {
  const base: Note[] = [{ id: 'n1', text: 'local' }];
  const baseIndex: SyncIndex = { n1: { updatedAt: T2, hash: hashRecord(base[0]), syncedAt: T2 } };

  it('applies a strictly-newer remote change', () => {
    const remote: RemoteChange<Note>[] = [
      { id: 'n1', updatedAt: T3, record: { id: 'n1', text: 'remote' } },
    ];
    const { records, index } = mergeRemote(base, baseIndex, remote);
    expect(records.find((r) => r.id === 'n1')!.text).toBe('remote');
    expect(index.n1.syncedAt).toBe(T3);
  });

  it('keeps local when the remote is older or equal', () => {
    const older: RemoteChange<Note>[] = [
      { id: 'n1', updatedAt: T1, record: { id: 'n1', text: 'stale' } },
    ];
    expect(mergeRemote(base, baseIndex, older).records[0].text).toBe('local');
    const equal: RemoteChange<Note>[] = [
      { id: 'n1', updatedAt: T2, record: { id: 'n1', text: 'tie' } },
    ];
    expect(mergeRemote(base, baseIndex, equal).records[0].text).toBe('local');
  });

  it('applies a remote tombstone and removes the record', () => {
    const del: RemoteChange<Note>[] = [{ id: 'n1', updatedAt: T3, deletedAt: T3 }];
    const { records, index } = mergeRemote(base, baseIndex, del);
    expect(records.find((r) => r.id === 'n1')).toBeUndefined();
    expect(index.n1.deletedAt).toBe(T3);
  });

  it('inserts a new remote record not present locally', () => {
    const add: RemoteChange<Note>[] = [
      { id: 'n2', updatedAt: T3, record: { id: 'n2', text: 'new' } },
    ];
    const { records } = mergeRemote(base, baseIndex, add);
    expect(records).toHaveLength(2);
  });

  it('merged remote records are not re-flagged as dirty afterward', () => {
    const remote: RemoteChange<Note>[] = [
      { id: 'n2', updatedAt: T3, record: { id: 'n2', text: 'new' } },
    ];
    const merged = mergeRemote(base, baseIndex, remote);
    const after = reconcileLocal(merged.records, merged.index, T3);
    expect(after.dirtyIds).toEqual([]);
  });
});

describe('maxCursor', () => {
  it('returns the latest updatedAt', () => {
    expect(maxCursor([{ updatedAt: T1 }, { updatedAt: T3 }, { updatedAt: T2 }], null)).toBe(T3);
    expect(maxCursor([], T2)).toBe(T2);
  });
});

describe('mapping', () => {
  it('strips envelope fields to recover the domain record', () => {
    const row = {
      id: 'n1',
      text: 'hi',
      userId: 'u1',
      createdAt: T1,
      updatedAt: T2,
      visibility: 'private',
    };
    expect(stripEnvelope<Note>(row)).toEqual({ id: 'n1', text: 'hi' });
  });

  it('maps a deleted row to a tombstone change', () => {
    const change = toRemoteChange<Note>({ id: 'n1', text: 'x', updatedAt: T2, deletedAt: T2 });
    expect(change.deletedAt).toBe(T2);
    expect(change.record).toBeUndefined();
  });
});
