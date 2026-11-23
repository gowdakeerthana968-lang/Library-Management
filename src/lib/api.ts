import type {
  Book,
  BookStatus,
  BorrowRecord,
  Student,
} from './libraryLogic';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string' && payload.error.trim()
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchStudents(): Promise<Student[]> {
  const data = await requestJson<{ students: Student[] }>('/api/students');
  return data.students;
}

export async function createStudentApi(input: {
  usn: number | string;
  name: string;
  department: string;
}): Promise<Student> {
  const data = await requestJson<{ student: Student }>('/api/students', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.student;
}

export async function updateStudentApi(
  usn: number | string,
  input: { name: string; department: string },
): Promise<Student> {
  const data = await requestJson<{ student: Student }>(
    `/api/students/${encodeURIComponent(String(usn))}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
  return data.student;
}

export async function fetchBooks(): Promise<Book[]> {
  const data = await requestJson<{ books: Book[] }>('/api/books');
  return data.books;
}

export async function createBookApi(input: {
  book_id: number | string;
  book_name: string;
  author: string;
}): Promise<Book> {
  const data = await requestJson<{ book: Book }>('/api/books', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.book;
}

export async function updateBookApi(
  bookId: number | string,
  input: { book_name: string; author: string; status: BookStatus },
): Promise<Book> {
  const data = await requestJson<{ book: Book }>(
    `/api/books/${encodeURIComponent(String(bookId))}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
  return data.book;
}

export async function fetchBorrows(): Promise<BorrowRecord[]> {
  const data = await requestJson<{ borrows: BorrowRecord[] }>('/api/borrows');
  return data.borrows;
}

export async function issueBookApi(input: {
  usn: number | string;
  book_id: number | string;
}): Promise<BorrowRecord> {
  const data = await requestJson<{ borrow: BorrowRecord }>('/api/borrows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.borrow;
}

export async function returnBookApi(borrowId: number): Promise<BorrowRecord> {
  const data = await requestJson<{ borrow: BorrowRecord }>(
    `/api/borrows/${encodeURIComponent(String(borrowId))}/return`,
    {
      method: 'POST',
    },
  );
  return data.borrow;
}
