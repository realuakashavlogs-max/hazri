import React, { useState } from 'react';
import { z } from 'zod';
import { useStudents } from '../../hooks/useStudents';
import { useClasses } from '../../hooks/useClasses';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { normalizePhoneNumber } from '../../lib/whatsapp';
import type { Student } from '../../types/database';
import {
  Plus,
  FileSpreadsheet,
  Search,
  MessageCircle,
  Edit2,
  Trash2,
  Phone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const studentPhoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const digits = val.replace(/[^0-9]/g, '');
      return digits.length >= 7 && digits.length <= 15;
    },
    { message: 'Enter a valid WhatsApp number with country code (7–15 digits).' }
  );

export const StudentsPage: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { classes } = useClasses();

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    students,
    isLoading,
    createStudent,
    bulkCreateStudents,
    updateStudent,
    deleteStudent,
  } = useStudents(selectedClassFilter === 'all' ? undefined : selectedClassFilter);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const [formName, setFormName] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');
  const [formPhoneError, setFormPhoneError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<number | null>(null);

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q))
    );
  });

  const handleOpenAdd = () => {
    setFormName('');
    setFormRoll('');
    setFormClassId(
      selectedClassFilter !== 'all' ? selectedClassFilter : classes[0]?.id || ''
    );
    setFormParentPhone('');
    setFormPhoneError(undefined);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormName(s.name);
    setFormRoll(s.roll_no || '');
    setFormClassId(s.class_id);
    setFormParentPhone(s.parent_phone || '');
    setFormPhoneError(undefined);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formClassId) return;

    const phoneValidation = studentPhoneSchema.safeParse(formParentPhone);
    if (!phoneValidation.success) {
      setFormPhoneError(phoneValidation.error.issues[0]?.message);
      return;
    }
    setFormPhoneError(undefined);

    const normalizedPhone = formParentPhone.trim()
      ? normalizePhoneNumber(formParentPhone.trim())
      : '';

    setIsSubmitting(true);
    try {
      if (editingStudent) {
        await updateStudent({
          id: editingStudent.id,
          updates: {
            class_id: formClassId,
            name: formName.trim(),
            roll_no: formRoll.trim() || null,
            parent_phone: normalizedPhone || null,
          },
        });
        setEditingStudent(null);
        showToast('Student updated!', 'success');
      } else {
        await createStudent({
          classId: formClassId,
          name: formName.trim(),
          rollNo: formRoll.trim() || undefined,
          parentPhone: normalizedPhone || undefined,
        });
        setIsAddModalOpen(false);
        showToast('Student added!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim() || !bulkClassId) return;

    setIsSubmitting(true);
    try {
      const count = await bulkCreateStudents({
        classId: bulkClassId,
        rawText: bulkText,
      });
      setBulkResult(count);
      showToast(`Imported ${count} students!`, 'success');
      setTimeout(() => {
        setIsBulkModalOpen(false);
        setBulkResult(null);
        setBulkText('');
      }, 1200);
    } catch (err: any) {
      showToast(err.message || 'Failed to import students', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
            {t('students.title')}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {filteredStudents.length} students shown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              setBulkClassId(
                selectedClassFilter !== 'all'
                  ? selectedClassFilter
                  : classes[0]?.id || ''
              );
              setIsBulkModalOpen(true);
            }}
            className="gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
            <span>{t('students.bulk_add')}</span>
          </Button>

          <Button onClick={handleOpenAdd} size="md" className="gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>{t('students.add_student')}</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips and Search Bar */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3.5 top-3.5 text-[var(--color-muted)]" />
          <input
            type="text"
            aria-label={t('students.search_placeholder')}
            placeholder={t('students.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] ps-10 pe-4 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {classes.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                selectedClassFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('students.all_classes')}
            </button>
            {classes.map((cls) => {
              const isSelected = selectedClassFilter === cls.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls.id)}
                  className={`px-3.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--color-text)] hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cls.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Student List */}
      {isLoading ? (
        <SkeletonCard count={3} />
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          variant="students"
          title="No Students Found"
          description={
            searchQuery
              ? `No student matching "${searchQuery}".`
              : 'Add students to this class or use Bulk Add to paste a list.'
          }
          action={
            classes.length > 0 ? (
              <Button onClick={handleOpenAdd}>{t('students.add_student')}</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStudents.map((s) => {
            const studentClass = classes.find((c) => c.id === s.class_id);
            const cleanPhone = normalizePhoneNumber(s.parent_phone);

            return (
              <div
                key={s.id}
                className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex flex-col justify-between hover:shadow-md transition-all duration-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {s.roll_no && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary shrink-0">
                          #{s.roll_no}
                        </span>
                      )}
                      <h2 className="font-bold text-base text-[var(--color-text)] truncate">
                        {s.name}
                      </h2>
                    </div>

                    {studentClass && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[var(--color-muted)] truncate max-w-[110px] shrink-0">
                        {studentClass.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-[var(--color-muted)] mb-3">
                    {s.parent_phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{s.parent_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  {cleanPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-bold text-[#16A34A] bg-[#16A34A]/10 hover:bg-[#16A34A]/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">No Phone</span>
                  )}

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(s)}
                      aria-label={`Edit ${s.name}`}
                      title="Edit"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStudent(s)}
                      aria-label={`Delete ${s.name}`}
                      title="Delete"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddModalOpen || Boolean(editingStudent)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent ? t('students.edit_student') : t('students.add_student')}
      >
        <form onSubmit={handleSaveStudent} className="space-y-3.5">
          <div>
            <label
              htmlFor="student-class-select"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              Class *
            </label>
            <select
              id="student-class-select"
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t('students.name') + ' *'}
            placeholder="e.g. Muhammad Ali"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label={t('students.roll_no')}
            placeholder="e.g. 101, 12"
            value={formRoll}
            onChange={(e) => setFormRoll(e.target.value)}
          />

          <Input
            label={t('students.parent_phone')}
            placeholder="e.g. 923001234567"
            value={formParentPhone}
            onChange={(e) => {
              setFormParentPhone(e.target.value);
              if (formPhoneError) setFormPhoneError(undefined);
            }}
            error={formPhoneError}
            helperText="Include country code without + or spaces for WhatsApp"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingStudent(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={t('students.bulk_add')}
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="bulk-class-select"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              Assign to Class *
            </label>
            <select
              id="bulk-class-select"
              value={bulkClassId}
              onChange={(e) => setBulkClassId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="bulk-students-textarea"
              className="block text-xs font-semibold text-[var(--color-text)] mb-1.5"
            >
              Student Records (One per line)
            </label>
            <p className="text-xs text-[var(--color-muted)] mb-2">
              Formats: <code>RollNo, Student Name, WhatsAppPhone</code> OR <code>Student Name</code>
            </p>
            <textarea
              id="bulk-students-textarea"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`101, Abdullah Tariq, 923001234567\n102, Mariam Bibi, 923007654321\nZaid Khan`}
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary min-h-[140px]"
              required
            />
          </div>

          {bulkResult !== null && (
            <div className="p-3 bg-emerald-50 text-[#16A34A] text-xs font-bold rounded-xl border border-emerald-200">
              Successfully imported {bulkResult} students!
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsBulkModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {t('students.bulk_submit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <Modal
          isOpen={Boolean(deletingStudent)}
          onClose={() => setDeletingStudent(null)}
          title={`Delete ${deletingStudent.name}?`}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              Are you sure you want to delete {deletingStudent.name}? All past attendance records for this student will also be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeletingStudent(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await deleteStudent(deletingStudent.id);
                    showToast('Student deleted', 'info');
                    setDeletingStudent(null);
                  } catch (err: any) {
                    showToast(err.message || 'Failed to delete student', 'error');
                  }
                }}
              >
                Delete Student
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
