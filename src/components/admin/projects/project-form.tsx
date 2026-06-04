'use client';

import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema } from '@/lib/schemas/project';
import { ProjectWithClient, Client } from '@/types';
import { createProject, updateProject } from '@/lib/actions/projects';
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, PRIORITIES, PRIORITY_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

interface ProjectFormProps {
  project?: ProjectWithClient;
  clients: Client[];
  onSuccess?: () => void;
}

type FormData = z.input<typeof createProjectSchema>;

export function ProjectForm({ project, clients, onSuccess }: ProjectFormProps) {
  const t = useTranslations('projects');
  const tc = useTranslations('common');
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: project?.title || '',
      description: project?.description || '',
      client_id: project?.client_id || '',
      project_type: project?.project_type || 'corporate_video',
      priority: project?.priority || 'medium',
      start_date: project?.start_date || '',
      deadline: project?.deadline || '',
      budget: project?.budget || undefined,
      filming_date: project?.filming_date || '',
      filming_time: project?.filming_time || '',
      location: project?.location || '',
    },
  });

  const selectedClientId = useWatch({ control: form.control, name: 'client_id' });
  const autoPrefixRef = useRef<string | null>(null);

  // On NEW productions, prefill the title with "{Client} — " so the client is
  // always part of the name (see docs/adr/0001). Runs only while creating and
  // only when the title is empty or still an untouched auto-prefix, so it never
  // clobbers text the user typed but does follow a client switch made first.
  useEffect(() => {
    if (project || !selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    const clientName = client?.company_name || client?.contact_name;
    if (!clientName) return;
    const prefix = `${clientName} — `;
    const current = form.getValues('title');
    if (!current || current === autoPrefixRef.current) {
      form.setValue('title', prefix);
      autoPrefixRef.current = prefix;
    }
  }, [selectedClientId, project, clients, form]);

  const onSubmit = async (data: FormData) => {
    const result = project ? await updateProject(project.id, data) : await createProject(data);

    if (!result.error) {
      toast.success(project ? t('projectUpdated') : t('projectCreated'));
      if (onSuccess) {
        onSuccess();
        return;
      }
      router.push('/admin/projects');
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('projectName')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tc('description')}</FormLabel>
              <FormControl>
                <Textarea placeholder={tc('description')} rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('client')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectClient')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name || client.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="project_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projectType')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('projectType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PROJECT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tc('priority')}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={tc('priority')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('startDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('endDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('budget')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : undefined);
                  }}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="filming_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('filmingDate')}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filming_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('filmingTime')}</FormLabel>
                <FormControl>
                  <Input type="time" step={900} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('filmingLocation')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('filmingLocation')} {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? tc('saving')
              : project
                ? t('editProject')
                : t('addProject')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {tc('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
