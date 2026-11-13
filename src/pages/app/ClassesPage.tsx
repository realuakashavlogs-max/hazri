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
  Archive,
  ArchiveRestore,
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
    isReadOnly,
    createClass,
    updateClass,
    archiveClass,
    deleteClass,
  } = useClasses();

  const { students } = useStudents();

  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<ClassItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeClasses = classes.filter((c) => !c.is_archived);
  const archivedClasses = classes.filter((c) => c.is_archived);
  const displayedClasses = tab === 'active' ? activeClasses : archivedClasses;

  const handleOpenAdd = () => {
    setFormName('');
    setFormSection('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormSection(cls.section || '');
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
            section: formSection.trim() || null,
          },
        });
        setEditingClass(null);
        showToast('Class updated!', 'success');
      } else {
        await createClass({
          name: formName.trim(),
          section: formSection.trim() || undefined,
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
            Manage your grade classes, batches, and student groups
          </p>
        </div>

        {!isReadOnly && (
          <Button onClick={handleOpenAdd} className="shrink-0 gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>{t('classes.add_class')}</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)]">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`min-h-[44px] px-4 text-sm font-bold transition-all border-b-2 ${
            tab === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {t('classes.active')} ({activeClasses.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('archived')}
          className={`min-h-[44px] px-4 text-sm font-bold transition-all border-b-2 ${
            tab === 'archived'
              ? 'border-primary text-primary'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          {t('classes.archived')} ({archivedClasses.length})
        </button>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <SkeletonCard count={3} />
      ) : displayedClasses.length === 0 ? (
        <EmptyState
          variant="classes"
          title={tab === 'active' ? 'No Active Classes' : 'No Archived Classes'}
          description={
            tab === 'active'
              ? 'Click Add Class above to create your first class (e.g. Class 5, Hifz Batch).'
              : 'Classes you archive will appear here safely preserved.'
          }
          action={
            tab === 'active' && !isReadOnly ? (
              <Button onClick={handleOpenAdd}>{t('classes.add_class')}</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedClasses.map((cls) => {
            const studentCount = students.filter(
              (s) => s.class_id === cls.id && !s.is_archived
            ).length;

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
                    {cls.section && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary shrink-0">
                        {cls.section}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-4">
                    <Users className="w-4 h-4" />
                    <span>{t('classes.students_count', { count: studentCount })}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                  {!cls.is_archived ? (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/attendance?classId=${cls.id}`)}
                      className="gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t('classes.mark_attendance')}</span>
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2.5 py-1 rounded-lg">
                      {t('classes.archived')}
                    </span>
                  )}

                  {!isReadOnly && (
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
                        onClick={() => archiveClass({ id: cls.id, isArchived: !cls.is_archived })}
                        aria-label={cls.is_archived ? t('classes.unarchive') : t('classes.archive')}
                        title={cls.is_archived ? t('classes.unarchive') : t('classes.archive')}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {cls.is_archived ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
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
                  )}
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

          <Input
            label={t('classes.section')}
            placeholder="e.g. Section B, Morning, Room 3"
            value={formSection}
            onChange={(e) => setFormSection(e.target.value)}
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

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await archiveClass({ id: deleteConfirmClass.id, isArchived: true });
                  setDeleteConfirmClass(null);
                }}
              >
                Archive Instead
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  await deleteClass(deleteConfirmClass.id);
                  setDeleteConfirmClass(null);
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
