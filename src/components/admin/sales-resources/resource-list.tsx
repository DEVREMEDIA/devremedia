'use client';

import { useState } from 'react';
import { Download, Trash2, File, Eye, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { deleteSalesResource, getSalesResourceDownloadUrl } from '@/lib/actions/sales-resources';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Resource {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  category: {
    title: string;
  };
}

interface Category {
  id: string;
  title: string;
  description: string | null;
}

interface ResourceListProps {
  resources: Resource[];
  categories: Category[];
  onDelete: () => void;
}

const isPdf = (fileType: string) => fileType === 'application/pdf';
const isImage = (fileType: string) => fileType.startsWith('image/');
const isViewable = (fileType: string) => isPdf(fileType) || isImage(fileType);

function getFileIcon(fileType: string) {
  if (isPdf(fileType)) return FileText;
  if (isImage(fileType)) return ImageIcon;
  return File;
}

export function ResourceList({ resources, categories, onDelete }: ResourceListProps) {
  const t = useTranslations('salesResources');
  const tc = useTranslations('common');
  const tToast = useTranslations('toast');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerResource, setViewerResource] = useState<Resource | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    const result = await deleteSalesResource(deletingId);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(tToast('deleteSuccess'));
    setDeleteDialogOpen(false);
    setDeletingId(null);
    onDelete();
  };

  const handleView = async (resource: Resource) => {
    if (!isViewable(resource.file_type)) {
      // For non-viewable files, open in new tab
      const result = await getSalesResourceDownloadUrl(resource.file_path);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) window.open(result.data, '_blank');
      return;
    }

    setIsLoadingView(true);
    setViewerResource(resource);

    const result = await getSalesResourceDownloadUrl(resource.file_path);
    setIsLoadingView(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      setViewerUrl(result.data);
      setViewerOpen(true);
    }
  };

  const handleDownload = async (filePath: string) => {
    const result = await getSalesResourceDownloadUrl(filePath, { download: true });
    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      const link = document.createElement('a');
      link.href = result.data;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerUrl(null);
    setViewerResource(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group resources by category
  const resourcesByCategory = categories
    .map((category) => ({
      category,
      resources: resources.filter((r) => r.category_id === category.id),
    }))
    .filter((group) => group.resources.length > 0);

  if (resources.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        {resourcesByCategory.map(({ category, resources: categoryResources }) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle>{category.title}</CardTitle>
              {category.description && <CardDescription>{category.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryResources.map((resource) => {
                  const IconComponent = getFileIcon(resource.file_type);
                  return (
                    <div
                      key={resource.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{resource.title}</p>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {resource.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="truncate">{resource.file_name}</span>
                            <span>·</span>
                            <span className="whitespace-nowrap">
                              {formatFileSize(resource.file_size)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 sm:ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(resource)}
                          disabled={isLoadingView}
                          title={tc('view')}
                        >
                          <Eye className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">{tc('view')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(resource.file_path)}
                          title="Download"
                        >
                          <Download className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(resource.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* File Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={handleCloseViewer}>
        <DialogContent className="max-w-[95vw] sm:max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-4">{viewerResource?.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                {viewerResource && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(viewerResource.file_path)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6">
            {viewerUrl && viewerResource && isPdf(viewerResource.file_type) && (
              <iframe
                src={viewerUrl}
                className="w-full h-full rounded-lg border"
                title={viewerResource.title}
              />
            )}
            {viewerUrl && viewerResource && isImage(viewerResource.file_type) && (
              <div className="w-full h-full flex items-center justify-center overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewerUrl}
                  alt={viewerResource.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteResourceTitle')}
        description="Are you sure you want to delete this resource? This action cannot be undone."
        confirmLabel={tc('delete')}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={isDeleting}
      />
    </>
  );
}
