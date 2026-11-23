import { Pencil, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
  filterStudents,
  validateStudentInput,
  validateStudentUpdateInput,
  type Student,
} from '../lib/libraryLogic';
import { EditModal } from './EditModal';

interface StudentPortalProps {
  students: Student[];
  isLoading: boolean;
  onCreateStudent: (input: {
    usn: number | string;
    name: string;
    department: string;
  }) => Promise<void>;
  onUpdateStudent: (
    usn: number | string,
    input: { name: string; department: string },
  ) => Promise<void>;
}

export function StudentPortal({
  students,
  isLoading,
  onCreateStudent,
  onUpdateStudent,
}: StudentPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Add Student form state
  const [usn, setUsn] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Student modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredStudents = useMemo(
    () => filterStudents(students, searchQuery),
    [students, searchQuery],
  );

  async function handleAddSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const validated = validateStudentInput({
      usn: usn.trim(),
      name,
      department,
    });
    if (!validated.ok) {
      setFormError(validated.error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateStudent(validated.data);
      setUsn('');
      setName('');
      setDepartment('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to register student.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setEditName(student.name);
    setEditDepartment(student.department);
    setEditError(null);
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingStudent) return;
    setEditError(null);

    const validated = validateStudentUpdateInput({
      name: editName,
      department: editDepartment,
    });
    if (!validated.ok) {
      setEditError(validated.error);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateStudent(editingStudent.usn, validated.data);
      setEditingStudent(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to update student.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <section aria-labelledby="student-portal-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            id="student-portal-heading"
            className="text-2xl font-bold tracking-tight text-slate-900"
          >
            Student Portal
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search registered borrowers, add new student records, and keep
            department details current.
          </p>
        </div>

        <div
          data-testid="student-total-badge"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 self-start sm:self-auto tabular-nums"
        >
          <Users className="w-3.5 h-3.5 text-blue-800" aria-hidden="true" />
          <span>
            {students.length} {students.length === 1 ? 'Student' : 'Students'}{' '}
            Registered
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Left: Searchable Student Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="student-search" className="sr-only">
                Search students by USN, name, or department
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="student-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by USN, name, or department..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-colors"
              />
            </div>

            {searchQuery.trim() && (
              <span className="text-xs text-slate-500 tabular-nums">
                Showing {filteredStudents.length} of {students.length}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 px-3 sm:px-6 w-24 sm:w-28">
                    USN
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4">
                    Student Name
                  </th>
                  <th scope="col" className="py-3 px-3 sm:px-4 w-24 sm:w-36">
                    Department
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 sm:px-6 text-right w-20 sm:w-28"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="h-11">
                      <td className="py-3 px-3 sm:px-6">
                        <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div className="h-4 w-32 sm:w-40 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-right">
                        <div className="h-7 w-14 bg-slate-100 rounded ml-auto animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 px-6 text-center text-slate-500"
                    >
                      <p className="text-sm font-medium text-slate-700">
                        {searchQuery.trim()
                          ? 'No students match your search query.'
                          : 'No students registered yet.'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {searchQuery.trim()
                          ? 'Try adjusting your USN, name, or department filter.'
                          : 'Use the Add New Student form to register the first student.'}
                      </p>
                      {searchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          Clear Search
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.usn}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-3 sm:px-6 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {student.usn}
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-medium text-slate-900">
                        {student.name}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-slate-600">
                        {student.department.trim() ? student.department : '—'}
                      </td>
                      <td className="py-3 px-3 sm:px-6 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          aria-label={`Edit ${student.name}`}
                          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Add New Student Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Add New Student
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Register a student into the PostgreSQL directory.
          </p>

          <form onSubmit={handleAddSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor="add-student-usn"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                University Seat Number (USN)
              </label>
              <input
                id="add-student-usn"
                type="text"
                inputMode="numeric"
                required
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 96"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="add-student-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="add-student-name"
                type="text"
                maxLength={100}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ananya Rao"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="add-student-department"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Department
              </label>
              <input
                id="add-student-department"
                type="text"
                maxLength={100}
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. AIML, CSE, ECE"
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
              <span>{isSubmitting ? 'Adding Student...' : 'Add Student'}</span>
            </button>
          </form>
        </div>
      </div>

      {editingStudent && (
        <EditModal
          title="Edit Student Details"
          subtitle={`USN ${editingStudent.usn}`}
          onClose={() => setEditingStudent(null)}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="edit-student-usn"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                USN (Primary Key)
              </label>
              <input
                id="edit-student-usn"
                type="text"
                value={String(editingStudent.usn)}
                disabled
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label
                htmlFor="edit-student-name"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="edit-student-name"
                type="text"
                maxLength={100}
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="edit-student-department"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Department
              </label>
              <input
                id="edit-student-department"
                type="text"
                maxLength={100}
                required
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
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
                onClick={() => setEditingStudent(null)}
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
