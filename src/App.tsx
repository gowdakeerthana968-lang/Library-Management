import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BookPortal } from './components/BookPortal';
import { BorrowListPortal } from './components/BorrowListPortal';
import { StudentPortal } from './components/StudentPortal';
import { TopNav } from './components/TopNav';
import {
  createBookApi,
  createStudentApi,
  fetchBooks,
  fetchBorrows,
  fetchStudents,
  issueBookApi,
  returnBookApi,
  updateBookApi,
  updateStudentApi,
} from './lib/api';
import {
  getPathFromPortal,
  getPortalFromPath,
  type Book,
  type BookStatus,
  type BorrowRecord,
  type PortalRoute,
  type Student,
} from './lib/libraryLogic';

export default function App() {
  const [activePortal, setActivePortal] = useState<PortalRoute>(() =>
    getPortalFromPath(window.location.pathname),
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const loadAllData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setGlobalError(null);

    try {
      const [studentList, bookList, borrowList] = await Promise.all([
        fetchStudents(),
        fetchBooks(),
        fetchBorrows(),
      ]);
      setStudents(studentList);
      setBooks(bookList);
      setBorrows(borrowList);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : 'Failed to load library data from PostgreSQL.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const normalizedPath = getPathFromPortal(activePortal);
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', normalizedPath);
    }
    void loadAllData(true);
  }, [loadAllData]);

  useEffect(() => {
    function handlePopState() {
      setActivePortal(getPortalFromPath(window.location.pathname));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function navigateTo(portal: PortalRoute) {
    const targetPath = getPathFromPortal(portal);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    setActivePortal(portal);
  }

  async function handleCreateStudent(input: {
    usn: number | string;
    name: string;
    department: string;
  }) {
    await createStudentApi(input);
    const updatedStudents = await fetchStudents();
    setStudents(updatedStudents);
  }

  async function handleUpdateStudent(
    usn: number | string,
    input: { name: string; department: string },
  ) {
    await updateStudentApi(usn, input);
    const [updatedStudents, updatedBorrows] = await Promise.all([
      fetchStudents(),
      fetchBorrows(),
    ]);
    setStudents(updatedStudents);
    setBorrows(updatedBorrows);
  }

  async function handleCreateBook(input: {
    book_id: number | string;
    book_name: string;
    author: string;
  }) {
    await createBookApi(input);
    const updatedBooks = await fetchBooks();
    setBooks(updatedBooks);
  }

  async function handleUpdateBook(
    bookId: number | string,
    input: { book_name: string; author: string; status: BookStatus },
  ) {
    await updateBookApi(bookId, input);
    const [updatedBooks, updatedBorrows] = await Promise.all([
      fetchBooks(),
      fetchBorrows(),
    ]);
    setBooks(updatedBooks);
    setBorrows(updatedBorrows);
  }

  async function handleIssueBook(input: {
    usn: number | string;
    book_id: number | string;
  }) {
    await issueBookApi(input);
    const [updatedBooks, updatedBorrows] = await Promise.all([
      fetchBooks(),
      fetchBorrows(),
    ]);
    setBooks(updatedBooks);
    setBorrows(updatedBorrows);
  }

  async function handleReturnBook(borrowId: number) {
    await returnBookApi(borrowId);
    const [updatedBooks, updatedBorrows] = await Promise.all([
      fetchBooks(),
      fetchBorrows(),
    ]);
    setBooks(updatedBooks);
    setBorrows(updatedBorrows);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activePortal={activePortal}
        onNavigate={navigateTo}
        onRefresh={() => void loadAllData(false)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {globalError && (
          <div
            role="alert"
            className="p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="w-5 h-5 text-red-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-sm font-semibold text-red-900">
                  Database Error
                </h2>
                <p className="mt-0.5 text-sm text-red-800 font-mono break-all">
                  {globalError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadAllData(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-red-900 bg-white border border-red-200 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              Retry Connection
            </button>
          </div>
        )}

        {activePortal === 'student' && (
          <StudentPortal
            students={students}
            isLoading={isLoading}
            onCreateStudent={handleCreateStudent}
            onUpdateStudent={handleUpdateStudent}
          />
        )}

        {activePortal === 'book' && (
          <BookPortal
            books={books}
            isLoading={isLoading}
            onCreateBook={handleCreateBook}
            onUpdateBook={handleUpdateBook}
          />
        )}

        {activePortal === 'borrowlist' && (
          <BorrowListPortal
            students={students}
            books={books}
            borrows={borrows}
            isLoading={isLoading}
            onIssueBook={handleIssueBook}
            onReturnBook={handleReturnBook}
          />
        )}
      </main>
    </div>
  );
}
