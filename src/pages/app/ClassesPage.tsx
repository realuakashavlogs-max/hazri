import React, { useState } from 'react';
import { useClasses } from '../../hooks/useClasses';
import { useStudents } from '../../hooks/useStudents';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import type { ClassItem } from '../../types/database';
import {
  Plus,
  Trash2,
  Edit2,
  Users,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ClassesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    classes,
    isLoading,
    createClass,
    updateClass,
    deleteClass,
  } = useClasses();

  const { students } = useStudents();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<ClassItem | null>(null);

  const [formName, setFormName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setFormName('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormName(cls.name);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingClass) {
        await updateClass({
          id: editingClass.id,
          updates: {
            name: formName.trim(),
          },
        });
        setEditingClass(null);
        showToast('Class updated!', 'success');
      } else {
        await createClass({
          name: formName.trim(),
        });
        setIsAddModalOpen(false);
        showToast('Class created!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-extrabold text-[var(--color-text)]">
            {t('classes.title')}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            Manage your classes, batches, and student groups
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="shrink-0 gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" />
          <span>{t('classes.add_class')}</span>
        </Button>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <SkeletonCard count={3} />
      ) : classes.length === 0 ? (
        <EmptyState
          variant="classes"
          title="No Classes Yet"
          description="Click Add Class above to create your first class (e.g. Class 5, Hifz Batch A)."
          action={<Button onClick={handleOpenAdd}>{t('classes.add_class')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => {
            const studentCount = students.filter((s) => s.class_id === cls.id).length;

            return (
              <div
                key={cls.id}
                className="bg-[var(--color-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-border)] flex flex-col justify-between hover:shadow-md transition-all duration-150"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-bold text-base text-[var(--color-text)] leading-tight">
                      {cls.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-4">
                    <Users className="w-4 h-4" />
                    <span>{t('classes.students_count', { count: studentCount })}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/attendance?classId=${cls.id}`)}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('classes.mark_attendance')}</span>
                  </Button>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cls)}
                      aria-label={`Edit ${cls.name}`}
                      title="Edit"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmClass(cls)}
                      aria-label={`Delete ${cls.name}`}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddModalOpen || Boolean(editingClass)}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingClass(null);
        }}
        title={editingClass ? t('classes.edit_class') : t('classes.add_class')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={t('classes.name') + ' *'}
            placeholder="e.g. Class 5, Hifz Batch A"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingClass(null);
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmClass && (
        <Modal
          isOpen={Boolean(deleteConfirmClass)}
          onClose={() => setDeleteConfirmClass(null)}
          title={`Delete "${deleteConfirmClass.name}"?`}
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200 font-medium leading-relaxed">
                {t('classes.delete_confirm')}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmClass(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await deleteClass(deleteConfirmClass.id);
                    showToast('Class deleted', 'info');
                    setDeleteConfirmClass(null);
                  } catch (err: any) {
                    showToast(err.message || 'Failed to delete class', 'error');
                  }
                }}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
