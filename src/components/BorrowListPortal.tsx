import {
  ArrowLeftRight,
  BookCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
  getAvailableBooks,
  validateBorrowInput,
  type Book,
  type BorrowRecord,
  type Student,
} from '../lib/libraryLogic';

interface BorrowListPortalProps {
  students: Student[];
  books: Book[];
  borrows: BorrowRecord[];
  isLoading: boolean;
  onIssueBook: (input: { usn: number | string; book_id: number | string }) => Promise<void>;
  onReturnBook: (borrowId: number) => Promise<void>;
}

export function BorrowListPortal({
  students,
  books,
  borrows,
  isLoading,
  onIssueBook,
  onReturnBook,
}: BorrowListPortalProps) {
  const [selectedUsn, setSelectedUsn] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const availableBooks = useMemo(() => getAvailableBooks(books), [books]);
  const activeBorrowCount = useMemo(
    () => borrows.filter((b) => b.status === 'Borrowed').length,
    [borrows],
  );

  async function handleIssueSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validated = validateBorrowInput({
      usn: selectedUsn,
      book_id: selectedBookId,
    });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setIsIssuing(true);
    try {
      await onIssueBook(validated.data);
      setSelectedUsn('');
      setSelectedBookId('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to issue book.',
      );
    } finally {
      setIsIssuing(false);
    }
  }

  async function handleReturn(borrowId: number) {
    setRowError(null);
    setReturningId(borrowId);
    try {
      await onReturnBook(borrowId);
    } catch (err) {
      setRowError(
        err instanceof Error ? err.message : 'Unable to return book.',
      );
    } finally {
      setReturningId(null);
    }
  }

  return (
    <section aria-labelledby="borrow-portal-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            id="borrow-portal-heading"
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Borrow List
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Issue available books to registered students and process returns in
            real time.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-md font-medium text-slate-700">
            <ArrowLeftRight
              className="w-3.5 h-3.5 text-blue-800"
              aria-hidden="true"
            />
            <span>{activeBorrowCount} Active Borrows</span>
          </span>
          <span>{borrows.length} Total Records</span>
        </div>
      </div>

      {rowError && (
        <div
          role="alert"
          className="p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-4"
        >
          <span>{rowError}</span>
          <button
            type="button"
            onClick={() => setRowError(null)}
            className="text-xs font-medium text-red-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left: Borrow Records Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Circulation Ledger
            </h2>
            <span className="text-xs text-slate-500 tabular-nums">
              {availableBooks.length} Available for Checkout
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-4 sm:px-6 w-20">
                    ID
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Student
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Book
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Borrow Date
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    Return Date
                  </th>
                  <th scope="col" className="py-3 px-4 w-28">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 sm:px-6 text-right w-36"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="h-12">
                      <td className="py-3 px-4 sm:px-6">
                        <div className="h-4 w-8 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-44 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-6 w-20 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <div className="h-7 w-24 bg-slate-100 rounded ml-auto animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : borrows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 px-6 text-center text-slate-500"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        No borrow records recorded yet.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Select a student and an available book in the Issue Book
                        form to log the first checkout.
                      </p>
                    </td>
                  </tr>
                ) : (
                  borrows.map((record) => {
                    const isBorrowed = record.status === 'Borrowed';
                    const isRowReturning = returningId === record.borrow_id;

                    return (
                      <tr
                        key={record.borrow_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-mono text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                          #{record.borrow_id}
                        </td>
                        <td className="py-3.5 px-4 min-w-[155px]">
                          <div className="font-medium text-slate-900">
                            {record.student_name}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                            USN {record.usn}
                            {record.department.trim()
                              ? ` · ${record.department}`
                              : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="font-medium text-slate-900">
                            {record.book_name}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            <span className="font-mono tabular-nums whitespace-nowrap">
                              ID {record.book_id}
                            </span>{' '}
                            · {record.author}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                          {record.borrow_date}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                          {record.return_date ?? '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${
                              isBorrowed
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isBorrowed ? (
                              <Clock
                                className="w-3.5 h-3.5 text-amber-700 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-emerald-700 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{record.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          {isBorrowed ? (
                            <button
                              type="button"
                              disabled={isRowReturning}
                              onClick={() => handleReturn(record.borrow_id)}
                              aria-label={`Return Book ${record.book_name} for ${record.student_name}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                            >
                              <RotateCcw
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span>
                                {isRowReturning ? 'Returning...' : 'Return Book'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Issue Book Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900">Issue Book</h2>
          <p className="mt-1 text-xs text-slate-500">
            Creates an active borrow record and sets the book status to
            Borrowed.
          </p>

          <form onSubmit={handleIssueSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor="issue-student-select"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Select Student
              </label>
              <select
                id="issue-student-select"
                value={selectedUsn}
                onChange={(e) => setSelectedUsn(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              >
                <option value="">Choose a student...</option>
                {students.map((s) => (
                  <option key={s.usn} value={String(s.usn)}>
                    {s.usn} — {s.name}
                    {s.department.trim() ? ` (${s.department})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="issue-book-select"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Select Available Book
              </label>
              <select
                id="issue-book-select"
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                required
                disabled={availableBooks.length === 0}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              >
                <option value="">
                  {availableBooks.length === 0
                    ? 'No books currently available'
                    : 'Choose an available book...'}
                </option>
                {availableBooks.map((b) => (
                  <option key={b.book_id} value={String(b.book_id)}>
                    {b.book_id} — {b.book_name}
                  </option>
                ))}
              </select>
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
              disabled={isIssuing || students.length === 0 || availableBooks.length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-800 rounded-lg hover:bg-blue-900 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-700"
            >
              <BookCheck className="w-4 h-4" aria-hidden="true" />
              <span>{isIssuing ? 'Issuing Book...' : 'Issue Book'}</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
