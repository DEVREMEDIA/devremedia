'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((category) => (
          <Link key={category.id} href={`/employee/university/${category.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                {category.description && (
                  <CardDescription className="line-clamp-3">{category.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('noCategoriesMatching', { query: searchQuery })}
          </p>
        </div>
      )}
    </div>
  );
}
