import { useEffect, useState } from 'react'
import type { NotesSnapshot, NotesStore } from './store.ts'

/**
 * Subscribe a component to the store.
 * @param store - the plugin's store.
 * @returns the current snapshot, refreshed on every notify.
 */
export function useNotes(store: NotesStore): NotesSnapshot {
  const [snapshot, setSnapshot] = useState(() => store.getSnapshot())
  useEffect(() => {
    setSnapshot(store.getSnapshot())
    return store.subscribe(() => setSnapshot(store.getSnapshot()))
  }, [store])
  return snapshot
}
