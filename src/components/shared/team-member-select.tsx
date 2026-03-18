'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
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

interface TeamMemberSelectProps {
  value: string | null;
  onValueChange: (id: string | null) => void;
}

export function TeamMemberSelect({ value, onValueChange }: TeamMemberSelectProps) {
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

  const selectedMember = members.find((m) => m.id === value);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {isLoading
              ? t('loading')
              : selectedMember
                ? (selectedMember.display_name ?? selectedMember.id.slice(0, 8))
                : t('selectAll')}
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
                    onSelect={() => {
                      onValueChange(member.id === value ? null : member.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === member.id ? 'opacity-100' : 'opacity-0',
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
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onValueChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
