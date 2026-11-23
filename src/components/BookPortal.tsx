import {
  BookMarked,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
  filterBooks,
  getBookCounts,
  validateBookInput,
  validateBookUpdateInput,
  type Book,
  type BookFilterTab,
  type BookStatus,
} from '../lib/libraryLogic';
import { EditModal } from './EditModal';

interface BookPortalProps {
  books: Book[];
  isLoading: boolean;
  onCreateBook: (input: {
    book_id: number | string;
    book_name: string;
    author: string;
  }) => Promise<void>;
  onUpdateBook: (
    bookId: number | string,
    input: { book_name: string; author: string; status: BookStatus },
  ) => Promise<void>;
}

const FILTER_TABS: { id: BookFilterTab; label: string }[] = [
  { id: 'All', label: 'All Books' },
  { id: 'Available', label: 'Available' },
  { id: 'Borrowed', label: 'Borrowed' },
];

export function BookPortal({
  books,
  isLoading,
  onCreateBook,
  onUpdateBook,
}: BookPortalProps) {
  const [activeTab, setActiveTab] = useState<BookFilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Book form state
  const [bookId, setBookId] = useState('');
  const [bookName, setBookName] = useState('');
  const [author, setAuthor] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Book modal state
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editBookName, setEditBookName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editStatus, setEditStatus] = useState<BookStatus>('Available');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const counts = useMemo(() => getBookCounts(books), [books]);
  const filteredBooks = useMemo(
    () => filterBooks(books, activeTab, searchQuery),
    [books, activeTab, searchQuery],
  );

  async function handleAddSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validated = validateBookInput({
      book_id: bookId.trim(),
      book_name: bookName,
      author,
      status: 'Available',
    });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateBook({
        book_id: validated.data.book_id,
        book_name: validated.data.book_name,
        author: validated.data.author,
      });
      setBookId('');
      setBookName('');
      setAuthor('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to add book.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(book: Book) {
    setEditingBook(book);
    setEditBookName(book.book_name);
    setEditAuthor(book.author);
    setEditStatus(book.status);
    setEditError(null);
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingBook) return;
    setEditError(null);

    const validated = validateBookUpdateInput({
      book_name: editBookName,
      author: editAuthor,
      status: editStatus,
    });
    if (!validated.ok) {
      setEditError(validated.error);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateBook(editingBook.book_id, validated.data);
      setEditingBook(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to update book.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section aria-labelledby="book-portal-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            id="book-portal-heading"
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Book Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Browse catalog holdings, filter by circulation availability, and
            maintain bibliographic records.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md font-medium text-slate-700">
            <BookMarked className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
            <span>{counts.total} Total</span>
          </span>
          <span>
            {counts.available} Available / {counts.borrowed} Borrowed
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left: Filterable & Searchable Books Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter books by availability"
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
            >
              {FILTER_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                const count =
                  tab.id === 'All'
                    ? counts.total
                    : tab.id === 'Available'
                      ? counts.available
                      : counts.borrowed;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 md:max-w-xs">
              <label htmlFor="book-search" className="sr-only">
                Search books by ID, title, or author
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="book-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, title, or author..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-4 sm:px-6 w-24">
                    Book ID
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Book Name
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Author
                  </th>
                  <th scope="col" className="py-3 px-4 w-32">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 sm:px-6 text-right w-28"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="h-11">
                      <td className="py-3 px-4 sm:px-6">
                        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-6 w-20 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <div className="h-7 w-14 bg-slate-100 rounded ml-auto animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredBooks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 px-6 text-center text-slate-500"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {searchQuery.trim() || activeTab !== 'All'
                          ? 'No books match the current filter.'
                          : 'No books in the catalog yet.'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {searchQuery.trim() || activeTab !== 'All'
                          ? 'Reset your filter tabs or search query to view all catalog records.'
                          : 'Use the Add New Book form to catalog your first title.'}
                      </p>
                      {(searchQuery.trim() || activeTab !== 'All') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('All');
                            setSearchQuery('');
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => {
                    const isAvailable = book.status === 'Available';
                    return (
                      <tr
                        key={book.book_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-4 sm:px-6 font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {book.book_id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {book.book_name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {book.author}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isAvailable ? (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-emerald-700 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Clock
                                className="w-3.5 h-3.5 text-amber-700 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{book.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() => openEditModal(book)}
                            aria-label={`Edit ${book.book_name}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                          >
                            <Pencil
                              className="w-3.5 h-3.5 text-slate-500"
                              aria-hidden="true"
                            />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Add New Book Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Add New Book
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Catalog a new volume with default Available status.
          </p>

          <form onSubmit={handleAddSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor="add-book-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book ID
              </label>
              <input
                id="add-book-id"
                type="text"
                inputMode="numeric"
                required
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="e.g. 2006"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="add-book-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book Name
              </label>
              <input
                id="add-book-name"
                type="text"
                maxLength={200}
                required
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="e.g. Operating System Concepts"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="add-book-author"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Author
              </label>
              <input
                id="add-book-author"
                type="text"
                maxLength={150}
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Abraham Silberschatz"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-700"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Adding Book...' : 'Add Book'}</span>
            </button>
          </form>
        </div>
      </div>

      {editingBook && (
        <EditModal
          title="Edit Book Details"
          subtitle={`Book ID ${editingBook.book_id}`}
          onClose={() => setEditingBook(null)}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="edit-book-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book ID (Primary Key)
              </label>
              <input
                id="edit-book-id"
                type="text"
                value={String(editingBook.book_id)}
                disabled
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="edit-book-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Book Name
              </label>
              <input
                id="edit-book-name"
                type="text"
                maxLength={200}
                required
                value={editBookName}
                onChange={(e) => setEditBookName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="edit-book-author"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Author
              </label>
              <input
                id="edit-book-author"
                type="text"
                maxLength={150}
                required
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="edit-book-status"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Status
              </label>
              <select
                id="edit-book-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as BookStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              >
                <option value="Available">Available</option>
                <option value="Borrowed">Borrowed</option>
              </select>
            </div>

            {editError && (
              <div
                role="alert"
                className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {editError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-60 transition-colors"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </EditModal>
      )}
    </section>
  );
}
