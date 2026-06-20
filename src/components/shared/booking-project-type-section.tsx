'use client';

import {
  Film,
  Mic,
  Zap,
  Clapperboard,
  Camera,
  FileText,
  Music,
  MoreHorizontal,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldErrors } from 'react-hook-form';

import { type PublicBookingInput } from '@/lib/schemas/filming-request';
import { PROJECT_TYPES, type ProjectType } from '@/lib/constants';

const PROJECT_TYPE_ICONS: Record<ProjectType, React.ComponentType<{ className?: string }>> = {
  social_media_content: Film,
  podcast: Mic,
  event_coverage: Zap,
  corporate_video: Clapperboard,
  commercial: Camera,
  documentary: FileText,
  music_video: Music,
  other: MoreHorizontal,
};

interface BookingProjectTypeSectionProps {
  selectedProjectType: ProjectType | undefined;
  errors: FieldErrors<PublicBookingInput>;
  onSelect: (type: ProjectType) => void;
}

export function BookingProjectTypeSection({
  selectedProjectType,
  errors,
  onSelect,
}: BookingProjectTypeSectionProps) {
  const t = useTranslations('publicBooking');
  const statusT = useTranslations('statuses');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">{t('projectTypeSection')}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PROJECT_TYPES.map((type) => {
          const Icon = PROJECT_TYPE_ICONS[type];
          const isSelected = selectedProjectType === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                    : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600'
                }
              `}
            >
              <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-amber-500' : 'text-zinc-400'}`} />
              <span
                className={`text-sm font-medium text-center ${isSelected ? 'text-amber-500' : 'text-zinc-300'}`}
              >
                {statusT(`projectType.${type}`)}
              </span>
            </button>
          );
        })}
      </div>

      {errors.project_type && <p className="text-sm text-red-400">{errors.project_type.message}</p>}
    </section>
  );
}
