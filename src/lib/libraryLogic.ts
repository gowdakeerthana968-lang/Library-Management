export type PortalRoute = 'student' | 'book' | 'borrowlist';

export type BookStatus = 'Available' | 'Borrowed';
export type BookFilterTab = 'All' | BookStatus;
export type BorrowStatus = 'Borrowed' | 'Returned';

export interface Student {
  usn: number | string;
  name: string;
  department: string;
}

export interface Book {
  book_id: number | string;
  book_name: string;
  author: string;
  status: BookStatus;
}

export interface BorrowRecord {
  borrow_id: number;
  usn: number | string;
  student_name: string;
  department: string;
  book_id: number | string;
  book_name: string;
  author: string;
  borrow_date: string;
  return_date: string | null;
  status: BorrowStatus;
}

export function getPortalFromPath(pathname: string): PortalRoute {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase();
  if (normalized === '/book') return 'book';
  if (normalized === '/borrowlist') return 'borrowlist';
  return 'student';
}

export function getPathFromPortal(portal: PortalRoute): string {
  switch (portal) {
    case 'student':
      return '/student';
    case 'book':
      return '/book';
    case 'borrowlist':
      return '/borrowlist';
  }
}

export function filterStudents(students: Student[], query: string): Student[] {
  const q = query.trim().toLowerCase();
  if (!q) return students;
  return students.filter(
    (s) =>
      String(s.usn).toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q),
  );
}

export function filterBooks(
  books: Book[],
  tab: BookFilterTab,
  query: string,
): Book[] {
  const byTab =
    tab === 'All' ? books : books.filter((book) => book.status === tab);
  const q = query.trim().toLowerCase();
  if (!q) return byTab;
  return byTab.filter(
    (b) =>
      String(b.book_id).toLowerCase().includes(q) ||
      b.book_name.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q),
  );
}

export function getBookCounts(books: Book[]): {
  total: number;
  available: number;
  borrowed: number;
} {
  let available = 0;
  let borrowed = 0;
  for (const book of books) {
    if (book.status === 'Available') available += 1;
    else if (book.status === 'Borrowed') borrowed += 1;
  }
  return {
    total: books.length,
    available,
    borrowed,
  };
}

export function getAvailableBooks(books: Book[]): Book[] {
  return books.filter((b) => b.status === 'Available');
}

function parseIdValue(raw: unknown): number | string | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isSafeInteger(n) && n > 0 ? n : trimmed;
    }
    return trimmed;
  }
  return null;
}

export function validateStudentInput(input: {
  usn: unknown;
  name: unknown;
  department: unknown;
}):
  | { ok: true; data: Student }
  | { ok: false; error: string } {
  const parsedUsn = parseIdValue(input.usn);
  if (parsedUsn === null) {
    return { ok: false, error: 'USN is required and must be valid.' };
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100) {
    return {
      ok: false,
      error: 'Student name is required and must be 100 characters or fewer.',
    };
  }
  const department =
    typeof input.department === 'string' ? input.department.trim() : '';
  if (!department || department.length > 100) {
    return {
      ok: false,
      error: 'Department is required and must be 100 characters or fewer.',
    };
  }
  return { ok: true, data: { usn: parsedUsn, name, department } };
}

export function validateStudentUpdateInput(input: {
  name: unknown;
  department: unknown;
}):
  | { ok: true; data: { name: string; department: string } }
  | { ok: false; error: string } {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 100) {
    return {
      ok: false,
      error: 'Student name is required and must be 100 characters or fewer.',
    };
  }
  const department =
    typeof input.department === 'string' ? input.department.trim() : '';
  if (!department || department.length > 100) {
    return {
      ok: false,
      error: 'Department is required and must be 100 characters or fewer.',
    };
  }
  return { ok: true, data: { name, department } };
}

export function validateBookInput(input: {
  book_id: unknown;
  book_name: unknown;
  author: unknown;
  status?: unknown;
}):
  | { ok: true; data: Book }
  | { ok: false; error: string } {
  const parsedId = parseIdValue(input.book_id);
  if (parsedId === null) {
    return { ok: false, error: 'Book ID is required and must be valid.' };
  }
  const book_name =
    typeof input.book_name === 'string' ? input.book_name.trim() : '';
  if (!book_name || book_name.length > 200) {
    return {
      ok: false,
      error: 'Book name is required and must be 200 characters or fewer.',
    };
  }
  const author = typeof input.author === 'string' ? input.author.trim() : '';
  if (!author || author.length > 150) {
    return {
      ok: false,
      error: 'Author is required and must be 150 characters or fewer.',
    };
  }
  const rawStatus = input.status ?? 'Available';
  if (rawStatus !== 'Available' && rawStatus !== 'Borrowed') {
    return {
      ok: false,
      error: "Book status must be either 'Available' or 'Borrowed'.",
    };
  }
  return {
    ok: true,
    data: { book_id: parsedId, book_name, author, status: rawStatus },
  };
}

export function validateBookUpdateInput(input: {
  book_name: unknown;
  author: unknown;
  status: unknown;
}):
  | { ok: true; data: { book_name: string; author: string; status: BookStatus } }
  | { ok: false; error: string } {
  const book_name =
    typeof input.book_name === 'string' ? input.book_name.trim() : '';
  if (!book_name || book_name.length > 200) {
    return {
      ok: false,
      error: 'Book name is required and must be 200 characters or fewer.',
    };
  }
  const author = typeof input.author === 'string' ? input.author.trim() : '';
  if (!author || author.length > 150) {
    return {
      ok: false,
      error: 'Author is required and must be 150 characters or fewer.',
    };
  }
  if (input.status !== 'Available' && input.status !== 'Borrowed') {
    return {
      ok: false,
      error: "Book status must be either 'Available' or 'Borrowed'.",
    };
  }
  return {
    ok: true,
    data: { book_name, author, status: input.status },
  };
}

export function validateBorrowInput(input: {
  usn: unknown;
  book_id: unknown;
}):
  | { ok: true; data: { usn: number | string; book_id: number | string } }
  | { ok: false; error: string } {
  const usn = parseIdValue(input.usn);
  if (usn === null) {
    return { ok: false, error: 'Please select a valid student.' };
  }
  const book_id = parseIdValue(input.book_id);
  if (book_id === null) {
    return { ok: false, error: 'Please select an available book.' };
  }
  return { ok: true, data: { usn, book_id } };
}
