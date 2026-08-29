'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteKnowledgeEntry } from '@/lib/actions/chatbot';
import { toast } from 'sonner';

type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  content: string;
  content_en: string | null;
  content_el: string | null;
};

type KnowledgeTableProps = {
  entries: KnowledgeEntry[];
};

export function KnowledgeTable({ entries }: KnowledgeTableProps) {
  const router = useRouter();
  const t = useTranslations('chatbot');

  const handleDelete = async (id: string) => {
    const result = await deleteKnowledgeEntry(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t('entryDeleted'));
      router.refresh();
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No knowledge entries. Click &quot;Seed Knowledge Base&quot; to populate with default
        content.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Title</TableHead>
          <TableHead className="hidden md:table-cell">Content Preview</TableHead>
          <TableHead className="w-[50px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted capitalize">
                {entry.category.replace(/_/g, ' ')}
              </span>
            </TableCell>
            <TableCell className="font-medium">{entry.title}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[300px] truncate">
              {entry.content_en || entry.content}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
