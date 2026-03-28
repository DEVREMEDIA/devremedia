'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  sort_order: number;
}

interface UniversityBrowseProps {
  categories: Category[];
}

export function UniversityBrowse({ categories }: UniversityBrowseProps) {
  const t = useTranslations('university');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = categories.filter(
    (category) =>
      category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchCategories')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={`/employee/university/${category.slug}`}>
            <div
              className={cn(
                'group rounded-xl border bg-card p-5 h-full cursor-pointer transition-all duration-300',
                'hover:shadow-[0_8px_30px_-4px_rgba(234,179,8,0.15)] hover:-translate-y-0.5',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-base mb-1.5">{category.title}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('noCategoriesMatching', { query: searchQuery })}
          </p>
        </div>
      )}
    </div>
  );
}
