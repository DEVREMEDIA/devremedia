'use client';

import { PROJECT_TYPES, PROJECT_TYPE_LABELS, type ProjectType } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import {
  Video,
  Camera,
  Share2,
  TrendingUp,
  Film,
  Music,
  Mic,
  MoreHorizontal,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { BookingFormData } from './booking-wizard';

interface StepProjectTypeProps {
  formData: BookingFormData;
  updateFormData: (data: Partial<BookingFormData>) => void;
}

const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  corporate_video: Video,
  event_coverage: Camera,
  social_media_content: Share2,
  commercial: TrendingUp,
  documentary: Film,
  music_video: Music,
  podcast: Mic,
  other: MoreHorizontal,
};

const PROJECT_TYPE_DESCRIPTIONS: Record<ProjectType, string> = {
  corporate_video: 'Εταιρικά profiles, testimonials, ετήσια video',
  event_coverage: 'Content on the spot — εγκαίνια, συνέδρια, events',
  social_media_content: 'Short-form content για social media',
  commercial: 'Διαφημιστικά και promotional video',
  documentary: 'Ντοκιμαντέρ και long-form storytelling',
  music_video: 'Music videos και performance recordings',
  podcast: 'Επαγγελματική παραγωγή podcast',
  other: 'Custom request — θα σας στείλουμε προσφορά',
};

export function StepProjectType({ formData, updateFormData }: StepProjectTypeProps) {
  const t = useTranslations('booking');

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-2">
      {PROJECT_TYPES.map((type) => {
        const Icon = PROJECT_TYPE_ICONS[type];
        const isSelected = formData.project_type === type;

        return (
          <Card
            key={type}
            className={cn(
              'group relative p-5 cursor-pointer border bg-card',
              'transition-all duration-300 ease-out',
              'hover:scale-[1.04] hover:-translate-y-1',
              'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.3)]',
              'dark:hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.2)]',
              isSelected
                ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-[0_8px_30px_-4px_rgba(234,179,8,0.35)]'
                : 'border-border hover:border-amber-400/60',
            )}
            onClick={() => updateFormData({ project_type: type, selected_package: undefined })}
          >
            {/* Selected check badge */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}

            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={cn(
                  'p-3 rounded-xl transition-colors duration-300',
                  isSelected
                    ? 'bg-amber-500 text-white'
                    : 'bg-muted text-muted-foreground group-hover:bg-amber-500/10 group-hover:text-amber-600 dark:group-hover:text-amber-400',
                )}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{PROJECT_TYPE_LABELS[type]}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {PROJECT_TYPE_DESCRIPTIONS[type]}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
