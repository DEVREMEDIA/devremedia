'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { getTeamMembers } from '@/lib/actions/team';
import { useTranslations } from 'next-intl';
import type { UserProfile } from '@/types/index';

interface TeamMemberMultiSelectProps {
  value: string[];
  onValueChange: (ids: string[]) => void;
}

export function TeamMemberMultiSelect({ value, onValueChange }: TeamMemberMultiSelectProps) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      const result = await getTeamMembers();
      if (result.data) {
        setMembers(result.data);
      }
      setIsLoading(false);
    };
    fetchMembers();
  }, []);

  const toggle = (id: string) => {
    onValueChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const selectedNames = members
    .filter((m) => value.includes(m.id))
    .map((m) => m.display_name ?? m.id.slice(0, 8));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {isLoading
              ? t('loading')
              : selectedNames.length > 0
                ? selectedNames.join(', ')
                : t('selectAll')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('search')} />
          <CommandList>
            <CommandEmpty>{t('noResults')}</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.display_name ?? member.id}
                  onSelect={() => toggle(member.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(member.id) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1 truncate">
                    {member.display_name ?? member.id.slice(0, 8)}
                  </span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {member.role}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
