'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  getConceptNotes,
  createConceptNote,
  updateConceptNote,
  deleteConceptNote,
} from '@/lib/actions/filming-prep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import dynamic from 'next/dynamic';
import { Plus, Trash2, FileText } from 'lucide-react';

const TiptapEditor = dynamic(
  () => import('@/components/shared/tiptap-editor').then((mod) => mod.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[200px] border rounded-lg">
        <LoadingSpinner size="md" />
      </div>
    ),
  },
);
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import type { ConceptNote } from '@/types';

interface ConceptNotesProps {
  projectId: string;
}

export function ConceptNotes({ projectId }: ConceptNotesProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');
  const [notes, setNotes] = useState<ConceptNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const result = await getConceptNotes(projectId);
    if (result.error) {
      toast.error(t('failedToLoadNotes'));
      setLoading(false);
      return;
    }

    setNotes(result.data ?? []);
    setSelectedNoteId((prev) => {
      if (!prev && result.data && result.data.length > 0) {
        return result.data[0].id;
      }
      return prev;
    });
    setLoading(false);
  }, [projectId, t]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const handleCreateNote = async () => {
    setCreating(true);
    const result = await createConceptNote({
      title: t('untitledNote'),
      content: '',
      project_id: projectId,
    });
    setCreating(false);

    if (result.error) {
      toast.error(t('failedToCreateNote'));
      return;
    }

    toast.success(t('noteCreated'));
    await loadNotes();
    setSelectedNoteId(result.data!.id);
  };

  const handleDeleteNote = async () => {
    if (!selectedNoteId) return;

    setDeleting(true);
    const result = await deleteConceptNote(selectedNoteId);
    setDeleting(false);
    setDeleteDialogOpen(false);

    if (result.error) {
      toast.error(t('failedToDeleteNote'));
      return;
    }

    toast.success(t('noteDeleted'));
    const remainingNotes = notes.filter((note) => note.id !== selectedNoteId);
    setNotes(remainingNotes);
    setSelectedNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
  };

  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={FileText}
            title={t('noConceptNotes')}
            description={t('createFirstConceptNote')}
            action={{ label: t('newNote'), onClick: handleCreateNote }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Button onClick={handleCreateNote} disabled={creating} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newNote')}
                </Button>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border transition-colors',
                          selectedNoteId === note.id
                            ? 'bg-accent border-primary'
                            : 'hover:bg-accent/50 border-transparent',
                        )}
                      >
                        <div className="font-medium truncate">{note.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.updated_at), 'MMM d, yyyy')}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-9">
          {selectedNote ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <NoteEditor
                  note={selectedNote}
                  onUpdate={() => loadNotes()}
                  onDelete={() => setDeleteDialogOpen(true)}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={FileText}
                  title={t('selectNote')}
                  description={t('selectNoteDescription')}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteNote')}
        description={t('deleteNoteConfirm')}
        confirmLabel={tc('delete')}
        onConfirm={handleDeleteNote}
        destructive
        loading={deleting}
      />
    </>
  );
}

interface NoteEditorProps {
  note: ConceptNote;
  onUpdate: () => void;
  onDelete: () => void;
}

function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
  const t = useTranslations('filmingPrep');
  const tc = useTranslations('common');
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
  }, [note.id, note.title, note.content]);

  const debouncedSave = (updates: { title?: string; content?: string }) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      const result = await updateConceptNote(note.id, updates);
      setSaving(false);

      if (result.error) {
        toast.error(t('failedToSaveNote'));
      } else {
        onUpdate();
      }
    }, 500);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave({ title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave({ content: newContent });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="text-2xl font-bold border-0 px-0 focus-visible:ring-0"
          placeholder={t('noteTitlePlaceholder')}
        />
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <LoadingSpinner size="sm" />
              {tc('saving')}
            </span>
          )}
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            {tc('delete')}
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {t('lastUpdated')}: {format(new Date(note.updated_at), 'PPpp')}
      </div>

      <TiptapEditor
        content={content}
        onChange={handleContentChange}
        placeholder={t('noteContentPlaceholder')}
      />
    </div>
  );
}
