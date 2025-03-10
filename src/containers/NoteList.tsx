import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MoreHorizontal } from 'react-feather'
import _ from 'lodash'

import { Folder } from 'constants/enums'
import NoteOptions from 'containers/NoteOptions'
import { getNoteTitle, sortByLastUpdated } from 'helpers'
import { addCategoryToNote, pruneNotes, swapCategory, swapNote, searchNotes } from 'slices/note'
import { NoteItem, ReactDragEvent, ReactMouseEvent, RootState } from 'types'

const NoteList: React.FC = () => {
  const { categories } = useSelector((state: RootState) => state.categoryState)
  const { activeCategoryId, activeFolder, activeNoteId, notes, searchValue } = useSelector(
    (state: RootState) => state.noteState
  )

  const re = new RegExp(_.escapeRegExp(searchValue), 'i')
  const isMatch = (result: NoteItem) => re.test(result.text)

  const filter: Record<Folder, (note: NoteItem) => boolean> = {
    [Folder.CATEGORY]: note => !note.trash && note.category === activeCategoryId,
    [Folder.FAVORITES]: note => !note.trash && !!note.favorite,
    [Folder.TRASH]: note => !!note.trash,
    [Folder.ALL]: note => !note.trash,
  }
  const filteredNotes: NoteItem[] = notes
    .filter(filter[activeFolder])
    .filter(isMatch)
    .sort(sortByLastUpdated)
  const filteredCategories = categories.filter(({ id }) => id !== activeCategoryId)

  const dispatch = useDispatch()

  const _addCategoryToNote = (categoryId: string, noteId: string) =>
    dispatch(addCategoryToNote({ categoryId, noteId }))
  const _pruneNotes = () => dispatch(pruneNotes())
  const _swapNote = (noteId: string) => dispatch(swapNote(noteId))
  const _swapCategory = (categoryId: string) => dispatch(swapCategory(categoryId))
  const _searchNotes = _.debounce((searchValue: string) => dispatch(searchNotes(searchValue)), 200)

  const [noteOptionsId, setNoteOptionsId] = useState('')
  const node = useRef<HTMLDivElement>(null)

  const handleNoteOptionsClick = (event: ReactMouseEvent, noteId: string = '') => {
    event.stopPropagation()

    if (node.current && node.current.contains(event.target as HTMLDivElement)) return
    setNoteOptionsId(!noteOptionsId || noteOptionsId !== noteId ? noteId : '')
  }

  const handleDragStart = (event: ReactDragEvent, noteId: string = '') => {
    event.stopPropagation()

    event.dataTransfer.setData('text/plain', noteId)
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleNoteOptionsClick)
    return () => {
      document.removeEventListener('mousedown', handleNoteOptionsClick)
    }
  })

  return (
    <aside className="note-sidebar">
      <div className="note-sidebar-header">
        <input
          type="search"
          onChange={event => {
            event.preventDefault()
            _searchNotes(event.target.value)
          }}
          placeholder="Search for notes"
        />
      </div>
      <div className="note-list">
        {filteredNotes.map(note => {
          let noteTitle: string | React.ReactElement = getNoteTitle(note.text)

          if (searchValue) {
            const highlightStart = noteTitle.search(re)

            if (highlightStart !== -1) {
              const highlightEnd = highlightStart + searchValue.length
              noteTitle = (
                <>
                  {noteTitle.slice(0, highlightStart)}
                  <strong style={{ color: '#3e64ff' }}>
                    {noteTitle.slice(highlightStart, highlightEnd)}
                  </strong>
                  {noteTitle.slice(highlightEnd)}
                </>
              )
            }
          }

          return (
            <div
              className={note.id === activeNoteId ? 'note-list-each active' : 'note-list-each'}
              key={note.id}
              onClick={() => {
                if (note.id !== activeNoteId) {
                  _swapNote(note.id)
                  _pruneNotes()
                }
              }}
              draggable
              onDragStart={event => handleDragStart(event, note.id)}
            >
              <div>{noteTitle}</div>
              <div
                className={noteOptionsId === note.id ? 'note-options active ' : 'note-options'}
                onClick={event => handleNoteOptionsClick(event, note.id)}
              >
                <MoreHorizontal size={15} />
              </div>
              {noteOptionsId === note.id && (
                <div
                  ref={node}
                  className="note-options-context-menu"
                  onClick={event => {
                    event.stopPropagation()
                  }}
                >
                  {!note.trash && (
                    <>
                      <select
                        defaultValue=""
                        className="select"
                        onChange={event => {
                          _addCategoryToNote(event.target.value, note.id)

                          if (event.target.value !== activeCategoryId) {
                            _swapCategory(event.target.value)
                            _swapNote(note.id)
                          }

                          setNoteOptionsId('')
                        }}
                      >
                        <option disabled value="">
                          Move to category...
                        </option>
                        {filteredCategories
                          .filter(category => category.id !== note.category)
                          .map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        {note.category && (
                          <option key="none" value="">
                            Remove category
                          </option>
                        )}
                      </select>
                    </>
                  )}
                  <NoteOptions clickedNote={note} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default NoteList
