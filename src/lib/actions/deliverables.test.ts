import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/apply-status-change', () => ({
  applyStatusChange: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/actions/notifications', () => ({
  createNotification: vi.fn(),
  getClientUserIdFromProject: vi.fn().mockResolvedValue(null),
}));

import { createClient } from '@/lib/supabase/server';
import { requestRevisionWithNote, addAnnotationReply } from './deliverables';

const mockCreateClient = vi.mocked(createClient);

const DELIVERABLE_ID = '123e4567-e89b-42d3-a456-426614174000';
const USER_ID = '123e4567-e89b-42d3-a456-426614174001';

function makeSupabaseWithResponses(responses: Record<string, unknown>) {
  const insertResult = responses['insert'] ?? { data: null, error: null };
  const updateResult = responses['update'] ?? {
    data: {
      id: DELIVERABLE_ID,
      project_id: 'proj-1',
      title: 'Test',
      description: null,
      file_path: 'https://example.com',
      file_size: null,
      file_type: null,
      version: 1,
      status: 'revision_requested',
      uploaded_by: USER_ID,
      download_count: 0,
      expires_at: null,
      created_at: '2026-01-01T00:00:00Z',
    },
    error: null,
  };
  const profileResult = responses['profile'] ?? { data: { role: 'client' } };

  let callCount = 0;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'video_annotations') {
        return {
          insert: vi.fn().mockReturnValue(Promise.resolve(insertResult)),
        };
      }
      if (table === 'deliverables') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(updateResult),
              }),
            }),
          }),
        };
      }
      if (table === 'user_profiles') {
        callCount++;
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(profileResult),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }),
        }),
      };
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requestRevisionWithNote', () => {
  it('returns error immediately when note is empty', async () => {
    const result = await requestRevisionWithNote(DELIVERABLE_ID, '');
    expect(result.error).toBe('Revision note is required');
    expect(result.data).toBeNull();
  });

  it('returns error immediately when note is only whitespace', async () => {
    const result = await requestRevisionWithNote(DELIVERABLE_ID, '   ');
    expect(result.error).toBe('Revision note is required');
    expect(result.data).toBeNull();
  });

  it('returns Unauthorized when not logged in', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const result = await requestRevisionWithNote(DELIVERABLE_ID, 'Change the intro');
    expect(result.error).toBe('Unauthorized');
  });

  it('persists the annotation with null timestamp and sets status to revision_requested', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = makeSupabaseWithResponses({ insert: { data: null, error: null } });
    // Override the annotations insert to capture the payload
    const annotationsFrom = vi.fn().mockReturnValue({ insert: insertMock });
    const originalFrom = supabase.from;
    supabase.from = vi.fn((table: string) => {
      if (table === 'video_annotations') return annotationsFrom(table);
      return originalFrom(table);
    }) as never;

    mockCreateClient.mockResolvedValue(supabase as never);

    const result = await requestRevisionWithNote(DELIVERABLE_ID, 'Change the intro music');

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.status).toBe('revision_requested');

    const insertCall = insertMock.mock.calls[0][0];
    expect(insertCall.deliverable_id).toBe(DELIVERABLE_ID);
    expect(insertCall.timestamp_seconds).toBeNull();
    expect(insertCall.content).toBe('Change the intro music');
    expect(insertCall.user_id).toBe(USER_ID);
  });

  it('returns error when annotation insert fails', async () => {
    const supabase = makeSupabaseWithResponses({});
    supabase.from = vi.fn((table: string) => {
      if (table === 'video_annotations') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        };
      }
      return (makeSupabaseWithResponses({}) as ReturnType<typeof makeSupabaseWithResponses>).from(
        table,
      );
    }) as never;

    mockCreateClient.mockResolvedValue(supabase as never);

    const result = await requestRevisionWithNote(DELIVERABLE_ID, 'Change something');
    expect(result.error).toBe('DB error');
  });
});

const ANNOTATION_ID = '123e4567-e89b-42d3-a456-426614174002';

describe('addAnnotationReply', () => {
  it('returns error immediately when content is empty', async () => {
    const result = await addAnnotationReply(ANNOTATION_ID, '', DELIVERABLE_ID);
    expect(result.error).toBe('Reply content is required');
    expect(result.data).toBeNull();
  });

  it('returns error immediately when content is only whitespace', async () => {
    const result = await addAnnotationReply(ANNOTATION_ID, '   ', DELIVERABLE_ID);
    expect(result.error).toBe('Reply content is required');
    expect(result.data).toBeNull();
  });

  it('returns Unauthorized when not logged in', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const result = await addAnnotationReply(ANNOTATION_ID, 'Looks good', DELIVERABLE_ID);
    expect(result.error).toBe('Unauthorized');
  });

  it('inserts reply with correct parent_id, deliverable_id and null timestamp', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'reply-1',
            deliverable_id: DELIVERABLE_ID,
            user_id: USER_ID,
            parent_id: ANNOTATION_ID,
            timestamp_seconds: null,
            content: 'Looks good now',
            resolved: false,
            created_at: '2026-01-01T00:00:00Z',
          },
          error: null,
        }),
      }),
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'video_annotations') {
          return { insert: insertMock };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }),
          }),
        };
      }),
    };

    mockCreateClient.mockResolvedValue(supabase as never);

    const result = await addAnnotationReply(ANNOTATION_ID, 'Looks good now', DELIVERABLE_ID);

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data?.parent_id).toBe(ANNOTATION_ID);
    expect(result.data?.timestamp_seconds).toBeNull();

    const insertPayload = insertMock.mock.calls[0][0];
    expect(insertPayload.parent_id).toBe(ANNOTATION_ID);
    expect(insertPayload.deliverable_id).toBe(DELIVERABLE_ID);
    expect(insertPayload.timestamp_seconds).toBeNull();
    expect(insertPayload.content).toBe('Looks good now');
    expect(insertPayload.user_id).toBe(USER_ID);
  });
});
