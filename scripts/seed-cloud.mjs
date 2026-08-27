#!/usr/bin/env node

/**
 * Cloud Supabase Database Seeder
 *
 * Populates the cloud Supabase database with demo data for Devre Media System.
 * Run with: node scripts/seed-cloud.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// This script used to carry a service_role key as a string literal, in a public
// repository, from the very first commit. A service_role key bypasses RLS
// entirely — it is read and write on every table, unconditionally. It never
// belongs in a file. The key that was here has been rotated; do not paste
// another one in its place.
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'seed-cloud — refusing to run without credentials in the environment.\n' +
      '  SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set.\n' +
      '  They live in .env.local, which is gitignored. Never hardcode them here.',
  );
  process.exit(1);
}

// This writes demo data with a key that ignores every access rule. Name the
// project it is about to touch, so nobody discovers afterwards that it was
// pointed at production.
console.log(`seed-cloud — target: ${SUPABASE_URL}`);

// Existing admin user ID
const ADMIN_USER_ID = '28c1112b-c764-4a46-84a4-446e5dc30d35';

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to log progress
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// Helper function to handle errors
function handleError(error, context) {
  log(`Error in ${context}: ${error.message}`, 'error');
  if (error.details) log(`Details: ${error.details}`, 'error');
  if (error.hint) log(`Hint: ${error.hint}`, 'error');
  throw error;
}

// Main seeding function
async function seed() {
  log('🚀 Starting cloud database seeding for Devre Media System');
  log(`📍 Supabase URL: ${SUPABASE_URL}`);

  let clientUserId;
  const ids = {}; // Store created IDs for foreign key references

  try {
    // ========================================
    // 1. CREATE CLIENT AUTH USER
    // ========================================
    log('\n👤 Creating client auth user...');

    // A password written here is a password published. It comes from the
    // environment, or this script does not create an account at all.
    const seedPassword = process.env.SEED_CLIENT_PASSWORD;
    if (!seedPassword) {
      log('   SEED_CLIENT_PASSWORD is not set — refusing to create an account.', 'error');
      process.exit(1);
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'client@demo.gr',
      password: seedPassword,
      email_confirm: true,
      user_metadata: {
        display_name: 'Dimitris Papadopoulos'
      }
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        // User already exists, find their ID
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 50 });
        const existing = listData?.users?.find(u => u.email === 'client@demo.gr');
        if (existing) {
          clientUserId = existing.id;
          log(`Client user already exists (ID: ${clientUserId}), reusing`, 'success');
        } else {
          handleError(authError, 'creating client auth user');
        }
      } else {
        handleError(authError, 'creating client auth user');
      }
    } else {
      clientUserId = authData.user.id;
      log(`Created client user: ${authData.user.email} (ID: ${clientUserId})`, 'success');
    }

    // Update user profile (user_profiles.id = auth.users.id)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        role: 'client',
        display_name: 'Dimitris Papadopoulos'
      })
      .eq('id', clientUserId);

    if (profileError) handleError(profileError, 'updating client user profile');
    log('Updated client user profile', 'success');

    // ========================================
    // 2. INSERT CLIENTS
    // ========================================
    log('\n🏢 Inserting clients...');

    const clients = [
      {
        id: randomUUID(),
        user_id: clientUserId, // Link to auth user
        company_name: 'Hellas Foods SA',
        contact_name: 'Dimitris Papadopoulos',
        email: 'client@demo.gr',
        phone: '+30 210 555 1234',
        address: 'Λεωφόρος Κηφισίας 115, Μαρούσι, 15124',
        vat_number: 'EL123456789',
        avatar_url: null,
        notes: 'Major food manufacturer. Regular corporate video client since 2024.',
        status: 'active',
        created_at: new Date('2024-06-15').toISOString(),
        updated_at: new Date('2024-06-15').toISOString()
      },
      {
        id: randomUUID(),
        user_id: null,
        company_name: 'Aegean Travel Group',
        contact_name: 'Maria Georgiou',
        email: 'maria@aegeantravel.gr',
        phone: '+30 210 555 5678',
        address: 'Πανεπιστημίου 32, Αθήνα, 10679',
        vat_number: 'EL987654321',
        avatar_url: null,
        notes: 'Travel agency chain. Needs promotional videos for summer 2026 campaign.',
        status: 'active',
        created_at: new Date('2024-09-20').toISOString(),
        updated_at: new Date('2024-09-20').toISOString()
      },
      {
        id: randomUUID(),
        user_id: null,
        company_name: 'TechStart Athens',
        contact_name: 'Nikos Petridis',
        email: 'nikos@techstart.gr',
        phone: '+30 210 555 9012',
        address: 'Ερμού 45, Σύνταγμα, Αθήνα, 10563',
        vat_number: 'EL456789123',
        avatar_url: null,
        notes: 'Tech startup incubator. Event coverage and social media content.',
        status: 'active',
        created_at: new Date('2025-01-10').toISOString(),
        updated_at: new Date('2025-01-10').toISOString()
      },
      {
        id: randomUUID(),
        user_id: null,
        company_name: 'Olympic Events & Catering',
        contact_name: 'Sofia Konstantinou',
        email: 'sofia@olympicevents.gr',
        phone: '+30 210 555 3456',
        address: 'Βουλιαγμένης 200, Γλυφάδα, 16674',
        vat_number: 'EL789123456',
        avatar_url: null,
        notes: 'Catering company. Previous client, currently inactive.',
        status: 'inactive',
        created_at: new Date('2023-11-05').toISOString(),
        updated_at: new Date('2025-08-15').toISOString()
      },
      {
        id: randomUUID(),
        user_id: null,
        company_name: 'Marina Bay Hotel',
        contact_name: 'Alexis Dimou',
        email: 'alexis@marinabay.gr',
        phone: '+30 22910 55789',
        address: 'Ακτή Ποσειδώνος 12, Πειραιάς, 18533',
        vat_number: 'EL321654987',
        avatar_url: null,
        notes: 'Luxury hotel. Interested in promotional video package. Follow up scheduled.',
        status: 'lead',
        created_at: new Date('2026-01-28').toISOString(),
        updated_at: new Date('2026-02-05').toISOString()
      }
    ];

    const { error: clientsError } = await supabase.from('clients').insert(clients);
    if (clientsError) handleError(clientsError, 'inserting clients');

    // Store client IDs for reference
    ids.clients = clients.map(c => ({ id: c.id, name: c.company_name }));
    log(`Created ${clients.length} clients`, 'success');

    // ========================================
    // 3. INSERT PROJECTS
    // ========================================
    log('\n🎬 Inserting projects...');

    const projects = [
      {
        id: randomUUID(),
        client_id: clients[0].id, // Hellas Foods
        title: 'Spring Product Launch 2026',
        description: 'Corporate video showcasing new organic product line. Includes factory footage, product shots, and customer testimonials.',
        project_type: 'corporate_video',
        status: 'editing',
        priority: 'high',
        start_date: '2026-01-15',
        deadline: '2026-02-28',
        budget: 12500.00,
        created_at: new Date('2026-01-10').toISOString(),
        updated_at: new Date('2026-02-08').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[1].id, // Aegean Travel
        title: 'Summer Islands Campaign',
        description: 'Social media video series featuring Greek islands destinations. 6 short-form videos for Instagram and TikTok.',
        project_type: 'social_media_content',
        status: 'pre_production',
        priority: 'urgent',
        start_date: '2026-02-10',
        deadline: '2026-03-15',
        budget: 8500.00,
        created_at: new Date('2026-02-01').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[2].id, // TechStart
        title: 'Startup Pitch Day 2026',
        description: 'Event coverage of annual startup pitch competition. Multi-camera setup, interviews, highlights reel.',
        project_type: 'event_coverage',
        status: 'briefing',
        priority: 'medium',
        start_date: '2026-03-20',
        deadline: '2026-04-05',
        budget: 6000.00,
        created_at: new Date('2026-02-05').toISOString(),
        updated_at: new Date('2026-02-05').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[0].id, // Hellas Foods
        title: 'Company Anniversary Documentary',
        description: '50th anniversary documentary. Archive footage restoration, interviews with founders and employees.',
        project_type: 'documentary',
        status: 'review',
        priority: 'medium',
        start_date: '2025-11-01',
        deadline: '2026-02-15',
        budget: 18000.00,
        created_at: new Date('2025-10-20').toISOString(),
        updated_at: new Date('2026-02-09').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[1].id, // Aegean Travel
        title: 'Winter Ski Resort Promo',
        description: 'Commercial for winter ski packages. Drone footage, action shots, family moments.',
        project_type: 'commercial',
        status: 'delivered',
        priority: 'high',
        start_date: '2025-12-01',
        deadline: '2026-01-10',
        budget: 9500.00,
        created_at: new Date('2025-11-25').toISOString(),
        updated_at: new Date('2026-01-12').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[2].id, // TechStart
        title: 'Monthly Tech Talks - February',
        description: 'Multi-camera recording of monthly tech talk event. Live streaming + edited upload.',
        project_type: 'event_coverage',
        status: 'filming',
        priority: 'medium',
        start_date: '2026-02-08',
        deadline: '2026-02-12',
        budget: 3200.00,
        created_at: new Date('2026-02-01').toISOString(),
        updated_at: new Date('2026-02-09').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[4].id, // Marina Bay Hotel
        title: 'Hotel Tour & Amenities Video',
        description: 'Luxury hotel promotional video. Room tours, amenities, sunset views, restaurant showcase.',
        project_type: 'commercial',
        status: 'pre_production',
        priority: 'low',
        start_date: '2026-02-12',
        deadline: '2026-03-10',
        budget: 7500.00,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        client_id: clients[0].id, // Hellas Foods
        title: 'Safety Training Series',
        description: 'Internal training videos for factory safety procedures. 4 modules.',
        project_type: 'corporate_video',
        status: 'revisions',
        priority: 'high',
        start_date: '2026-01-20',
        deadline: '2026-02-20',
        budget: 5500.00,
        created_at: new Date('2026-01-15').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      }
    ];

    const { error: projectsError } = await supabase.from('projects').insert(projects);
    if (projectsError) handleError(projectsError, 'inserting projects');

    ids.projects = projects.map(p => ({ id: p.id, title: p.title }));
    log(`Created ${projects.length} projects`, 'success');

    // ========================================
    // 4. INSERT TASKS
    // ========================================
    log('\n✅ Inserting tasks...');

    const tasks = [
      // Project 0 tasks (Spring Product Launch)
      {
        id: randomUUID(),
        project_id: projects[0].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Review rough cut with client',
        description: 'Schedule review meeting and gather feedback on current edit.',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-02-14',
        sort_order: 1,
        created_at: new Date('2026-02-08').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id,
        assigned_to: null,
        title: 'Color grading',
        description: 'Apply color grading to match brand guidelines.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-02-18',
        sort_order: 2,
        created_at: new Date('2026-02-08').toISOString(),
        updated_at: new Date('2026-02-08').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Sound mixing and mastering',
        description: 'Final audio mix with background music and voiceover.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-02-20',
        sort_order: 3,
        created_at: new Date('2026-02-08').toISOString(),
        updated_at: new Date('2026-02-08').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id,
        assigned_to: null,
        title: 'Factory B-roll footage captured',
        description: 'Captured 2 hours of factory floor footage.',
        status: 'done',
        priority: 'high',
        due_date: '2026-01-25',
        sort_order: 0,
        created_at: new Date('2026-01-20').toISOString(),
        updated_at: new Date('2026-01-26').toISOString()
      },
      // Project 1 tasks (Summer Islands)
      {
        id: randomUUID(),
        project_id: projects[1].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Scout locations in Santorini',
        description: 'Visit Santorini to scout filming locations. Coordinate with local contacts.',
        status: 'in_progress',
        priority: 'urgent',
        due_date: '2026-02-15',
        sort_order: 1,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Finalize shot list',
        description: 'Complete detailed shot list for all 6 island locations.',
        status: 'review',
        priority: 'high',
        due_date: '2026-02-18',
        sort_order: 2,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id,
        assigned_to: null,
        title: 'Book drone pilot',
        description: 'Hire licensed drone pilot for aerial shots.',
        status: 'todo',
        priority: 'high',
        due_date: '2026-02-20',
        sort_order: 3,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id,
        assigned_to: null,
        title: 'Initial client meeting completed',
        description: 'Met with client to discuss vision and deliverables.',
        status: 'done',
        priority: 'urgent',
        due_date: '2026-02-05',
        sort_order: 0,
        created_at: new Date('2026-02-01').toISOString(),
        updated_at: new Date('2026-02-05').toISOString()
      },
      // Project 2 tasks (Startup Pitch Day)
      {
        id: randomUUID(),
        project_id: projects[2].id,
        assigned_to: null,
        title: 'Venue visit and technical assessment',
        description: 'Visit event venue to assess lighting, power, and audio setup.',
        status: 'todo',
        priority: 'high',
        due_date: '2026-02-25',
        sort_order: 1,
        created_at: new Date('2026-02-05').toISOString(),
        updated_at: new Date('2026-02-05').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[2].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Create equipment checklist',
        description: 'Multi-camera setup equipment list and backup plan.',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-02-20',
        sort_order: 2,
        created_at: new Date('2026-02-05').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      // Project 3 tasks (Anniversary Documentary)
      {
        id: randomUUID(),
        project_id: projects[3].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Client review - final cut',
        description: 'Send final cut for client approval.',
        status: 'review',
        priority: 'high',
        due_date: '2026-02-12',
        sort_order: 1,
        created_at: new Date('2026-02-09').toISOString(),
        updated_at: new Date('2026-02-09').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[3].id,
        assigned_to: null,
        title: 'Archive footage restoration',
        description: 'Digitize and restore 8mm film from company archives.',
        status: 'done',
        priority: 'high',
        due_date: '2025-12-15',
        sort_order: 0,
        created_at: new Date('2025-11-10').toISOString(),
        updated_at: new Date('2025-12-18').toISOString()
      },
      // Project 5 tasks (Tech Talks)
      {
        id: randomUUID(),
        project_id: projects[5].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Set up live stream',
        description: 'Configure live streaming to YouTube. Test connection.',
        status: 'in_progress',
        priority: 'urgent',
        due_date: '2026-02-11',
        sort_order: 1,
        created_at: new Date('2026-02-09').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[5].id,
        assigned_to: null,
        title: 'Audio check with venue',
        description: 'Test audio feed from venue mixer.',
        status: 'todo',
        priority: 'high',
        due_date: '2026-02-11',
        sort_order: 2,
        created_at: new Date('2026-02-09').toISOString(),
        updated_at: new Date('2026-02-09').toISOString()
      },
      // Project 6 tasks (Hotel Tour)
      {
        id: randomUUID(),
        project_id: projects[6].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Schedule filming dates',
        description: 'Coordinate with hotel management for filming access.',
        status: 'in_progress',
        priority: 'medium',
        due_date: '2026-02-15',
        sort_order: 1,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[6].id,
        assigned_to: null,
        title: 'Draft storyboard',
        description: 'Create visual storyboard for room tours and amenities.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-02-18',
        sort_order: 2,
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      // Project 7 tasks (Safety Training)
      {
        id: randomUUID(),
        project_id: projects[7].id,
        assigned_to: ADMIN_USER_ID,
        title: 'Implement client feedback on Module 2',
        description: 'Update Module 2 based on safety manager comments.',
        status: 'in_progress',
        priority: 'high',
        due_date: '2026-02-13',
        sort_order: 1,
        created_at: new Date('2026-02-11').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[7].id,
        assigned_to: null,
        title: 'Re-record voiceover for Module 4',
        description: 'Client requested clearer pronunciation for safety terms.',
        status: 'todo',
        priority: 'medium',
        due_date: '2026-02-15',
        sort_order: 2,
        created_at: new Date('2026-02-11').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[7].id,
        assigned_to: null,
        title: 'Modules 1-4 filmed and edited',
        description: 'All 4 modules completed and sent for review.',
        status: 'done',
        priority: 'high',
        due_date: '2026-02-05',
        sort_order: 0,
        created_at: new Date('2026-01-25').toISOString(),
        updated_at: new Date('2026-02-08').toISOString()
      }
    ];

    const { error: tasksError } = await supabase.from('tasks').insert(tasks);
    if (tasksError) handleError(tasksError, 'inserting tasks');

    log(`Created ${tasks.length} tasks`, 'success');

    // ========================================
    // 5. INSERT DELIVERABLES
    // ========================================
    log('\n🎥 Inserting deliverables...');

    const deliverables = [
      {
        id: randomUUID(),
        project_id: projects[4].id, // Winter Ski Resort (delivered)
        title: 'Winter Ski Resort Promo - Final Cut',
        description: 'Final approved version for broadcast and social media.',
        file_path: 'deliverables/winter-ski-promo-final-v3.mp4',
        file_size: 2147483648, // 2GB
        file_type: 'video/mp4',
        version: 3,
        status: 'final',
        download_count: 8,
        expires_at: null,
        uploaded_by: ADMIN_USER_ID,
        created_at: new Date('2026-01-10').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[3].id, // Anniversary Documentary
        title: '50th Anniversary Documentary - Review Cut',
        description: 'Full documentary cut for final client review.',
        file_path: 'deliverables/anniversary-doc-review-v2.mp4',
        file_size: 4294967296, // 4GB
        file_type: 'video/mp4',
        version: 2,
        status: 'pending_review',
        download_count: 3,
        expires_at: new Date('2026-02-25').toISOString(),
        uploaded_by: ADMIN_USER_ID,
        created_at: new Date('2026-02-09').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        title: 'Product Launch Video - Rough Cut',
        description: 'First assembly for client feedback.',
        file_path: 'deliverables/spring-launch-rough-v1.mp4',
        file_size: 1610612736, // 1.5GB
        file_type: 'video/mp4',
        version: 1,
        status: 'revision_requested',
        download_count: 5,
        expires_at: new Date('2026-02-20').toISOString(),
        uploaded_by: ADMIN_USER_ID,
        created_at: new Date('2026-02-08').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[7].id, // Safety Training
        title: 'Safety Module 1 - Equipment Handling',
        description: 'First training module - equipment safety procedures.',
        file_path: 'deliverables/safety-module-1-v2.mp4',
        file_size: 858993459, // 800MB
        file_type: 'video/mp4',
        version: 2,
        status: 'approved',
        download_count: 12,
        expires_at: null,
        uploaded_by: ADMIN_USER_ID,
        created_at: new Date('2026-02-05').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[7].id, // Safety Training
        title: 'Safety Module 2 - Emergency Procedures',
        description: 'Second training module - emergency response.',
        file_path: 'deliverables/safety-module-2-v1.mp4',
        file_size: 943718400, // 900MB
        file_type: 'video/mp4',
        version: 1,
        status: 'revision_requested',
        download_count: 2,
        expires_at: new Date('2026-02-18').toISOString(),
        uploaded_by: ADMIN_USER_ID,
        created_at: new Date('2026-02-11').toISOString()
      }
    ];

    const { error: deliverablesError } = await supabase.from('deliverables').insert(deliverables);
    if (deliverablesError) handleError(deliverablesError, 'inserting deliverables');

    ids.deliverables = deliverables.map(d => ({ id: d.id, title: d.title }));
    log(`Created ${deliverables.length} deliverables`, 'success');

    // ========================================
    // 6. INSERT VIDEO ANNOTATIONS
    // ========================================
    log('\n💬 Inserting video annotations...');

    const annotations = [
      {
        id: randomUUID(),
        deliverable_id: deliverables[1].id, // Anniversary doc
        user_id: clientUserId,
        timestamp_seconds: 45.5,
        content: 'Can we add the company logo here with a subtle animation?',
        resolved: false,
        created_at: new Date('2026-02-10T10:30:00Z').toISOString()
      },
      {
        id: randomUUID(),
        deliverable_id: deliverables[1].id,
        user_id: ADMIN_USER_ID,
        timestamp_seconds: 125.2,
        content: 'Audio levels need adjustment - voiceover too quiet.',
        resolved: true,
        created_at: new Date('2026-02-09T14:15:00Z').toISOString()
      },
      {
        id: randomUUID(),
        deliverable_id: deliverables[2].id, // Product launch
        user_id: clientUserId,
        timestamp_seconds: 78.0,
        content: 'Product shot needs to be 3-4 seconds longer. Currently too quick.',
        resolved: false,
        created_at: new Date('2026-02-09T16:20:00Z').toISOString()
      },
      {
        id: randomUUID(),
        deliverable_id: deliverables[2].id,
        user_id: clientUserId,
        timestamp_seconds: 156.8,
        content: 'Love this transition! Can we use this style throughout?',
        resolved: false,
        created_at: new Date('2026-02-09T16:25:00Z').toISOString()
      },
      {
        id: randomUUID(),
        deliverable_id: deliverables[4].id, // Safety Module 2
        user_id: ADMIN_USER_ID,
        timestamp_seconds: 234.5,
        content: 'Need to re-record this section with clearer pronunciation per client feedback.',
        resolved: false,
        created_at: new Date('2026-02-11T09:00:00Z').toISOString()
      }
    ];

    const { error: annotationsError } = await supabase.from('video_annotations').insert(annotations);
    if (annotationsError) handleError(annotationsError, 'inserting video annotations');

    log(`Created ${annotations.length} video annotations`, 'success');

    // ========================================
    // 7. INSERT INVOICES
    // ========================================
    log('\n💰 Inserting invoices...');

    const invoices = [
      {
        id: randomUUID(),
        invoice_number: 'INV-2026-001',
        client_id: clients[0].id, // Hellas Foods
        project_id: projects[0].id, // Spring Product Launch
        status: 'sent',
        issue_date: '2026-02-01',
        due_date: '2026-02-15',
        subtotal: 10000.00,
        tax_rate: 24.00,
        tax_amount: 2400.00,
        total: 12400.00,
        currency: 'EUR',
        notes: 'Payment terms: Net 15 days. Bank transfer or credit card accepted.',
        line_items: [
          {
            description: 'Pre-production & planning',
            quantity: 1,
            unit: 'package',
            rate: 1500.00,
            amount: 1500.00
          },
          {
            description: 'Filming days (2 days)',
            quantity: 2,
            unit: 'day',
            rate: 2500.00,
            amount: 5000.00
          },
          {
            description: 'Video editing & post-production',
            quantity: 1,
            unit: 'package',
            rate: 3000.00,
            amount: 3000.00
          },
          {
            description: 'Color grading',
            quantity: 1,
            unit: 'package',
            rate: 500.00,
            amount: 500.00
          }
        ],
        payment_method: null,
        paid_at: null,
        stripe_payment_intent_id: null,
        created_at: new Date('2026-02-01').toISOString(),
        updated_at: new Date('2026-02-01').toISOString()
      },
      {
        id: randomUUID(),
        invoice_number: 'INV-2026-002',
        client_id: clients[1].id, // Aegean Travel
        project_id: projects[4].id, // Winter Ski Resort
        status: 'paid',
        issue_date: '2026-01-05',
        due_date: '2026-01-20',
        subtotal: 7661.29,
        tax_rate: 24.00,
        tax_amount: 1838.71,
        total: 9500.00,
        currency: 'EUR',
        notes: 'Thank you for your business!',
        line_items: [
          {
            description: 'Ski resort filming package',
            quantity: 1,
            unit: 'package',
            rate: 5500.00,
            amount: 5500.00
          },
          {
            description: 'Drone aerial footage',
            quantity: 1,
            unit: 'package',
            rate: 1800.00,
            amount: 1800.00
          },
          {
            description: 'Editing & color grading',
            quantity: 1,
            unit: 'package',
            rate: 361.29,
            amount: 361.29
          }
        ],
        payment_method: 'stripe',
        paid_at: new Date('2026-01-18T14:32:00Z').toISOString(),
        stripe_payment_intent_id: 'pi_3Mock123PaymentIntent',
        created_at: new Date('2026-01-05').toISOString(),
        updated_at: new Date('2026-01-18').toISOString()
      },
      {
        id: randomUUID(),
        invoice_number: 'INV-2025-089',
        client_id: clients[0].id, // Hellas Foods
        project_id: projects[3].id, // Anniversary Doc
        status: 'overdue',
        issue_date: '2025-12-20',
        due_date: '2026-01-05',
        subtotal: 14516.13,
        tax_rate: 24.00,
        tax_amount: 3483.87,
        total: 18000.00,
        currency: 'EUR',
        notes: 'OVERDUE - Please remit payment immediately. Late fees may apply.',
        line_items: [
          {
            description: 'Documentary production',
            quantity: 1,
            unit: 'package',
            rate: 12000.00,
            amount: 12000.00
          },
          {
            description: 'Archive footage restoration',
            quantity: 8,
            unit: 'hours',
            rate: 150.00,
            amount: 1200.00
          },
          {
            description: 'Additional interviews',
            quantity: 1,
            unit: 'package',
            rate: 1316.13,
            amount: 1316.13
          }
        ],
        payment_method: null,
        paid_at: null,
        stripe_payment_intent_id: null,
        created_at: new Date('2025-12-20').toISOString(),
        updated_at: new Date('2026-01-06').toISOString()
      },
      {
        id: randomUUID(),
        invoice_number: 'INV-2026-003',
        client_id: clients[2].id, // TechStart
        project_id: projects[5].id, // Tech Talks
        status: 'viewed',
        issue_date: '2026-02-08',
        due_date: '2026-02-22',
        subtotal: 2580.65,
        tax_rate: 24.00,
        tax_amount: 619.35,
        total: 3200.00,
        currency: 'EUR',
        notes: 'Monthly tech talk recording and streaming service.',
        line_items: [
          {
            description: 'Multi-camera recording',
            quantity: 1,
            unit: 'event',
            rate: 1500.00,
            amount: 1500.00
          },
          {
            description: 'Live streaming setup',
            quantity: 1,
            unit: 'event',
            rate: 800.00,
            amount: 800.00
          },
          {
            description: 'Video editing & upload',
            quantity: 1,
            unit: 'package',
            rate: 280.65,
            amount: 280.65
          }
        ],
        payment_method: null,
        paid_at: null,
        stripe_payment_intent_id: null,
        created_at: new Date('2026-02-08').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        invoice_number: 'DRAFT-2026-004',
        client_id: clients[1].id, // Aegean Travel
        project_id: projects[1].id, // Summer Islands
        status: 'draft',
        issue_date: '2026-02-11',
        due_date: '2026-02-25',
        subtotal: 6854.84,
        tax_rate: 24.00,
        tax_amount: 1645.16,
        total: 8500.00,
        currency: 'EUR',
        notes: 'Draft - pending final project scope confirmation.',
        line_items: [
          {
            description: 'Social media video series (6 videos)',
            quantity: 6,
            unit: 'video',
            rate: 900.00,
            amount: 5400.00
          },
          {
            description: 'Travel & accommodation expenses',
            quantity: 1,
            unit: 'package',
            rate: 1454.84,
            amount: 1454.84
          }
        ],
        payment_method: null,
        paid_at: null,
        stripe_payment_intent_id: null,
        created_at: new Date('2026-02-11').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      }
    ];

    const { error: invoicesError } = await supabase.from('invoices').insert(invoices);
    if (invoicesError) handleError(invoicesError, 'inserting invoices');

    log(`Created ${invoices.length} invoices`, 'success');

    // ========================================
    // 8. INSERT EXPENSES
    // ========================================
    log('\n💳 Inserting expenses...');

    const expenses = [
      {
        id: randomUUID(),
        project_id: projects[4].id, // Winter Ski Resort
        category: 'Travel',
        description: 'Fuel and highway tolls for Ski Resort shoot',
        amount: 185.50,
        date: '2025-12-15',
        receipt_path: 'receipts/fuel-receipt-dec-15.pdf',
        created_at: new Date('2025-12-16').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id, // Summer Islands
        category: 'Equipment Rental',
        description: 'Drone rental (3 days) - DJI Mavic 3 Pro',
        amount: 450.00,
        date: '2026-02-10',
        receipt_path: 'receipts/drone-rental-feb-2026.pdf',
        created_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        category: 'Catering',
        description: 'Crew catering for 2-day factory shoot (6 people)',
        amount: 280.00,
        date: '2026-01-22',
        receipt_path: 'receipts/catering-jan-22.jpg',
        created_at: new Date('2026-01-23').toISOString()
      }
    ];

    const { error: expensesError } = await supabase.from('expenses').insert(expenses);
    if (expensesError) handleError(expensesError, 'inserting expenses');

    log(`Created ${expenses.length} expenses`, 'success');

    // ========================================
    // 9. INSERT MESSAGES
    // ========================================
    log('\n💬 Inserting messages...');

    const messages = [
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        sender_id: clientUserId,
        content: 'Hi! Just watched the rough cut. Overall looks great! I left some annotations on specific timestamps. Main thing: can we extend the product closeup at around 1:18?',
        attachments: [],
        read_by: [ADMIN_USER_ID],
        created_at: new Date('2026-02-09T16:30:00Z').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id,
        sender_id: ADMIN_USER_ID,
        content: 'Thanks for the feedback! Yes, we can definitely extend that shot. I\'ll also address the other annotations and have an updated version ready by Thursday.',
        attachments: [],
        read_by: [clientUserId],
        created_at: new Date('2026-02-10T09:15:00Z').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[3].id, // Anniversary Doc
        sender_id: ADMIN_USER_ID,
        content: 'Documentary review cut is now uploaded! Please check the deliverables section. Looking forward to your thoughts on the final edit.',
        attachments: [
          {
            id: randomUUID(),
            name: 'Anniversary_Doc_Notes.pdf',
            url: 'attachments/anniversary-notes.pdf',
            size: 245760,
            type: 'application/pdf'
          }
        ],
        read_by: [],
        created_at: new Date('2026-02-09T17:45:00Z').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id, // Summer Islands
        sender_id: ADMIN_USER_ID,
        content: 'Heads up - I\'ll be in Santorini Feb 13-15 for location scouting. Will send you photos of the spots we\'re considering!',
        attachments: [],
        read_by: [],
        created_at: new Date('2026-02-11T11:20:00Z').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[7].id, // Safety Training
        sender_id: clientUserId,
        content: 'Module 1 looks perfect, approved! For Module 2, our safety manager flagged a few technical terms that need clearer pronunciation. I\'ve added annotations. Can you re-record those parts?',
        attachments: [],
        read_by: [ADMIN_USER_ID],
        created_at: new Date('2026-02-11T10:00:00Z').toISOString()
      }
    ];

    const { error: messagesError } = await supabase.from('messages').insert(messages);
    if (messagesError) handleError(messagesError, 'inserting messages');

    log(`Created ${messages.length} messages`, 'success');

    // ========================================
    // 10. INSERT CONTRACT TEMPLATES
    // ========================================
    log('\n📄 Inserting contract templates...');

    const contractTemplates = [
      {
        id: randomUUID(),
        title: 'Standard Production Agreement',
        content: `<h1>VIDEO PRODUCTION AGREEMENT</h1>

<p>This Video Production Agreement ("Agreement") is entered into on {{contract_date}} between:</p>

<p><strong>Producer:</strong> Devre Media<br/>
Address: Λεωφόρος Συγγρού 234, Αθήνα, 17672<br/>
VAT: EL999888777<br/>
Email: info@devremedia.gr</p>

<p><strong>Client:</strong> {{client_name}}<br/>
Address: {{client_address}}<br/>
VAT: {{client_vat}}<br/>
Email: {{client_email}}</p>

<h2>1. PROJECT DESCRIPTION</h2>
<p>The Producer agrees to provide video production services for the project titled: <strong>{{project_title}}</strong></p>
<p>{{project_description}}</p>

<h2>2. DELIVERABLES</h2>
<p>The Producer will deliver:</p>
<ul>
<li>Final edited video in MP4 format (1080p or 4K as specified)</li>
<li>Raw footage files (optional, upon request)</li>
<li>Project files for future edits (optional, additional fee)</li>
</ul>

<h2>3. TIMELINE</h2>
<p>Start Date: {{start_date}}<br/>
Delivery Date: {{deadline}}</p>

<h2>4. PAYMENT TERMS</h2>
<p>Total Project Fee: €{{project_budget}}<br/>
Payment Schedule:</p>
<ul>
<li>50% deposit upon signing this agreement</li>
<li>50% upon final delivery and approval</li>
</ul>
<p>Late payments are subject to 1.5% interest per month.</p>

<h2>5. COPYRIGHT & USAGE RIGHTS</h2>
<p>Upon full payment, the Client receives full commercial usage rights to the final deliverables. The Producer retains the right to use project materials for portfolio and promotional purposes unless otherwise agreed.</p>

<h2>6. REVISIONS</h2>
<p>The project includes up to 2 rounds of revisions. Additional revisions will be billed at €150/hour.</p>

<h2>7. CANCELLATION</h2>
<p>Either party may cancel this agreement with 7 days written notice. The Client is responsible for payment of all work completed up to the cancellation date.</p>

<h2>8. GOVERNING LAW</h2>
<p>This Agreement shall be governed by the laws of Greece.</p>

<p><strong>Agreed and Accepted:</strong></p>
<p>Client Signature: ___________________________<br/>
Date: {{signature_date}}</p>`,
        placeholders: [
          'contract_date',
          'client_name',
          'client_address',
          'client_vat',
          'client_email',
          'project_title',
          'project_description',
          'start_date',
          'deadline',
          'project_budget',
          'signature_date'
        ],
        created_at: new Date('2024-05-10').toISOString()
      },
      {
        id: randomUUID(),
        title: 'Event Coverage Agreement',
        content: `<h1>EVENT COVERAGE AGREEMENT</h1>

<p>This Event Coverage Agreement is made on {{contract_date}} between:</p>

<p><strong>Videographer:</strong> Devre Media<br/>
Email: info@devremedia.gr</p>

<p><strong>Client:</strong> {{client_name}}<br/>
Email: {{client_email}}<br/>
Phone: {{client_phone}}</p>

<h2>EVENT DETAILS</h2>
<p><strong>Event:</strong> {{event_name}}<br/>
<strong>Date:</strong> {{event_date}}<br/>
<strong>Time:</strong> {{event_time}}<br/>
<strong>Location:</strong> {{event_location}}</p>

<h2>SERVICES</h2>
<p>Devre Media will provide:</p>
<ul>
<li>{{hours_of_coverage}} hours of event coverage</li>
<li>Multi-camera setup ({{number_of_cameras}} cameras)</li>
<li>Professional audio recording</li>
<li>Edited highlights reel ({{highlights_duration}} minutes)</li>
<li>Full event recording (optional)</li>
</ul>

<h2>DELIVERABLES</h2>
<ul>
<li>Highlights reel delivered within {{delivery_timeline}} after event</li>
<li>Full footage available upon request</li>
<li>Digital delivery via secure download link</li>
</ul>

<h2>PAYMENT</h2>
<p>Total Fee: €{{total_fee}}<br/>
Deposit (50%): €{{deposit_amount}} - Due upon signing<br/>
Balance: €{{balance_amount}} - Due on event day</p>

<h2>CANCELLATION POLICY</h2>
<ul>
<li>More than 30 days before event: Full refund minus €200 booking fee</li>
<li>15-30 days before event: 50% refund</li>
<li>Less than 15 days: No refund</li>
</ul>

<h2>CLIENT RESPONSIBILITIES</h2>
<p>The Client agrees to:</p>
<ul>
<li>Provide access to event venue and necessary permissions</li>
<li>Inform venue coordinator of filming activity</li>
<li>Provide event timeline and key moments list</li>
</ul>

<p><strong>Client Signature:</strong> ___________________________<br/>
<strong>Date:</strong> {{signature_date}}</p>`,
        placeholders: [
          'contract_date',
          'client_name',
          'client_email',
          'client_phone',
          'event_name',
          'event_date',
          'event_time',
          'event_location',
          'hours_of_coverage',
          'number_of_cameras',
          'highlights_duration',
          'delivery_timeline',
          'total_fee',
          'deposit_amount',
          'balance_amount',
          'signature_date'
        ],
        created_at: new Date('2024-07-18').toISOString()
      }
    ];

    const { error: templatesError } = await supabase.from('contract_templates').insert(contractTemplates);
    if (templatesError) handleError(templatesError, 'inserting contract templates');

    ids.contractTemplates = contractTemplates.map(t => ({ id: t.id, title: t.title }));
    log(`Created ${contractTemplates.length} contract templates`, 'success');

    // ========================================
    // 11. INSERT CONTRACTS
    // ========================================
    log('\n📝 Inserting contracts...');

    const contracts = [
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        client_id: clients[0].id,
        title: 'Spring Product Launch - Production Agreement',
        content: contractTemplates[0].content
          .replace('{{contract_date}}', '2026-01-08')
          .replace('{{client_name}}', 'Hellas Foods SA')
          .replace('{{client_address}}', 'Λεωφόρος Κηφισίας 115, Μαρούσι, 15124')
          .replace('{{client_vat}}', 'EL123456789')
          .replace('{{client_email}}', 'client@demo.gr')
          .replace('{{project_title}}', 'Spring Product Launch 2026')
          .replace('{{project_description}}', 'Corporate video showcasing new organic product line. Includes factory footage, product shots, and customer testimonials.')
          .replace('{{start_date}}', '2026-01-15')
          .replace('{{deadline}}', '2026-02-28')
          .replace('{{project_budget}}', '12,500')
          .replace('{{signature_date}}', '2026-01-10'),
        template_id: contractTemplates[0].id,
        status: 'signed',
        sent_at: new Date('2026-01-08T10:00:00Z').toISOString(),
        viewed_at: new Date('2026-01-08T14:30:00Z').toISOString(),
        signed_at: new Date('2026-01-10T09:15:00Z').toISOString(),
        signature_data: {
          signature_svg: '<svg>...</svg>',
          ip_address: '94.68.xxx.xxx',
          user_agent: 'Mozilla/5.0...'
        },
        pdf_path: 'contracts/spring-product-launch-signed.pdf',
        expires_at: null,
        created_at: new Date('2026-01-08').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[2].id, // Startup Pitch Day
        client_id: clients[2].id,
        title: 'Startup Pitch Day 2026 - Event Coverage',
        content: contractTemplates[1].content
          .replace('{{contract_date}}', '2026-02-05')
          .replace('{{client_name}}', 'TechStart Athens')
          .replace('{{client_email}}', 'nikos@techstart.gr')
          .replace('{{client_phone}}', '+30 210 555 9012')
          .replace('{{event_name}}', 'Startup Pitch Day 2026')
          .replace('{{event_date}}', '2026-03-20')
          .replace('{{event_time}}', '09:00 - 18:00')
          .replace('{{event_location}}', 'Technopolis, Gazi, Athens')
          .replace('{{hours_of_coverage}}', '8')
          .replace('{{number_of_cameras}}', '3')
          .replace('{{highlights_duration}}', '5-7')
          .replace('{{delivery_timeline}}', '10 business days')
          .replace('{{total_fee}}', '6,000')
          .replace('{{deposit_amount}}', '3,000')
          .replace('{{balance_amount}}', '3,000')
          .replace('{{signature_date}}', ''),
        template_id: contractTemplates[1].id,
        status: 'sent',
        sent_at: new Date('2026-02-05T15:20:00Z').toISOString(),
        viewed_at: null,
        signed_at: null,
        signature_data: null,
        pdf_path: null,
        expires_at: new Date('2026-03-05').toISOString(),
        created_at: new Date('2026-02-05').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[1].id, // Summer Islands
        client_id: clients[1].id,
        title: 'Summer Islands Campaign - Production Agreement',
        content: contractTemplates[0].content
          .replace('{{contract_date}}', '2026-02-01')
          .replace('{{client_name}}', 'Aegean Travel Group')
          .replace('{{client_address}}', 'Πανεπιστημίου 32, Αθήνα, 10679')
          .replace('{{client_vat}}', 'EL987654321')
          .replace('{{client_email}}', 'maria@aegeantravel.gr')
          .replace('{{project_title}}', 'Summer Islands Campaign')
          .replace('{{project_description}}', 'Social media video series featuring Greek islands destinations. 6 short-form videos for Instagram and TikTok.')
          .replace('{{start_date}}', '2026-02-10')
          .replace('{{deadline}}', '2026-03-15')
          .replace('{{project_budget}}', '8,500')
          .replace('{{signature_date}}', '2026-02-03'),
        template_id: contractTemplates[0].id,
        status: 'signed',
        sent_at: new Date('2026-02-01T11:00:00Z').toISOString(),
        viewed_at: new Date('2026-02-02T09:45:00Z').toISOString(),
        signed_at: new Date('2026-02-03T13:20:00Z').toISOString(),
        signature_data: {
          signature_svg: '<svg>...</svg>',
          ip_address: '95.78.xxx.xxx',
          user_agent: 'Mozilla/5.0...'
        },
        pdf_path: 'contracts/summer-islands-signed.pdf',
        expires_at: null,
        created_at: new Date('2026-02-01').toISOString()
      }
    ];

    const { error: contractsError } = await supabase.from('contracts').insert(contracts);
    if (contractsError) handleError(contractsError, 'inserting contracts');

    log(`Created ${contracts.length} contracts`, 'success');

    // ========================================
    // 12. INSERT FILMING REQUESTS
    // ========================================
    log('\n🎥 Inserting filming requests...');

    const filmingRequests = [
      {
        id: randomUUID(),
        client_id: clients[4].id, // Marina Bay Hotel
        title: 'Hotel Tour & Amenities Video',
        description: 'We need a professional promotional video showcasing our newly renovated luxury hotel. Focus on rooms, restaurant, spa, and sunset views from the rooftop bar. Target audience: high-end travelers and wedding planners.',
        preferred_dates: ['2026-02-15', '2026-02-16', '2026-02-22'],
        location: 'Marina Bay Hotel, Ακτή Ποσειδώνος 12, Πειραιάς, 18533',
        project_type: 'commercial',
        budget_range: '€7,000 - €8,000',
        reference_links: [
          'https://vimeo.com/example-hotel-tour',
          'https://youtube.com/example-luxury-resort'
        ],
        status: 'converted',
        admin_notes: 'Great opportunity. Client is serious and has good budget. Converted to project.',
        converted_project_id: projects[6].id,
        created_at: new Date('2026-02-06T16:45:00Z').toISOString()
      },
      {
        id: randomUUID(),
        client_id: null, // No client record yet
        title: 'Wedding Videography - June 2026',
        description: 'Looking for a videographer for our wedding on June 14, 2026 in Mykonos. We want cinematic coverage of the ceremony and reception, plus a same-day edit for the reception. About 150 guests.',
        preferred_dates: ['2026-06-14'],
        location: 'Mykonos, Cyclades',
        project_type: 'event_coverage',
        budget_range: '€4,000 - €5,500',
        reference_links: [
          'https://instagram.com/weddingvideo_inspiration'
        ],
        status: 'pending',
        admin_notes: null,
        converted_project_id: null,
        created_at: new Date('2026-02-09T19:30:00Z').toISOString()
      }
    ];

    const { error: filmingRequestsError } = await supabase.from('filming_requests').insert(filmingRequests);
    if (filmingRequestsError) handleError(filmingRequestsError, 'inserting filming requests');

    log(`Created ${filmingRequests.length} filming requests`, 'success');

    // ========================================
    // 13. INSERT EQUIPMENT LISTS
    // ========================================
    log('\n📦 Inserting equipment lists...');

    const equipmentLists = [
      {
        id: randomUUID(),
        project_id: projects[1].id, // Summer Islands
        items: [
          {
            id: randomUUID(),
            category: 'Cameras',
            name: 'Sony A7S III',
            quantity: 2,
            notes: 'Primary cameras',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Cameras',
            name: 'DJI Mavic 3 Pro',
            quantity: 1,
            notes: 'Drone - rented',
            checked: false
          },
          {
            id: randomUUID(),
            category: 'Lenses',
            name: 'Sony 24-70mm f/2.8 GM',
            quantity: 2,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Lenses',
            name: 'Sony 70-200mm f/2.8 GM',
            quantity: 1,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Support',
            name: 'DJI Ronin RS3 Pro',
            quantity: 1,
            notes: 'Gimbal stabilizer',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Support',
            name: 'Manfrotto Carbon Fiber Tripod',
            quantity: 2,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Audio',
            name: 'Rode Wireless GO II',
            quantity: 2,
            notes: 'Wireless lav mics',
            checked: false
          },
          {
            id: randomUUID(),
            category: 'Audio',
            name: 'Zoom H6 Recorder',
            quantity: 1,
            notes: '',
            checked: false
          },
          {
            id: randomUUID(),
            category: 'Lighting',
            name: 'Aputure 300d II',
            quantity: 2,
            notes: '',
            checked: false
          },
          {
            id: randomUUID(),
            category: 'Accessories',
            name: 'ND Filters Set',
            quantity: 1,
            notes: 'Variable ND',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Accessories',
            name: 'Extra Batteries (Sony NP-FZ100)',
            quantity: 8,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Storage',
            name: 'SanDisk Extreme Pro 256GB',
            quantity: 6,
            notes: 'CFexpress cards',
            checked: true
          }
        ],
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[5].id, // Tech Talks
        items: [
          {
            id: randomUUID(),
            category: 'Cameras',
            name: 'Canon C70',
            quantity: 3,
            notes: 'Multi-camera setup',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Lenses',
            name: 'Canon RF 24-105mm f/4',
            quantity: 3,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Audio',
            name: 'Shure SM58 (wired mics)',
            quantity: 2,
            notes: 'For Q&A',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Audio',
            name: 'XLR Cables',
            quantity: 5,
            notes: '20ft',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Audio',
            name: 'Behringer X32 Mixer',
            quantity: 1,
            notes: 'Venue provides, need adapter',
            checked: false
          },
          {
            id: randomUUID(),
            category: 'Streaming',
            name: 'Blackmagic ATEM Mini Pro',
            quantity: 1,
            notes: 'Live switcher',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Streaming',
            name: 'HDMI Cables (25ft)',
            quantity: 4,
            notes: '',
            checked: true
          },
          {
            id: randomUUID(),
            category: 'Support',
            name: 'Tripods',
            quantity: 3,
            notes: 'Heavy duty',
            checked: true
          }
        ],
        created_at: new Date('2026-02-09').toISOString(),
        updated_at: new Date('2026-02-11').toISOString()
      }
    ];

    const { error: equipmentError } = await supabase.from('equipment_lists').insert(equipmentLists);
    if (equipmentError) handleError(equipmentError, 'inserting equipment lists');

    log(`Created ${equipmentLists.length} equipment lists`, 'success');

    // ========================================
    // 14. INSERT SHOT LISTS
    // ========================================
    log('\n🎬 Inserting shot lists...');

    const shotLists = [
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        shots: [
          {
            id: randomUUID(),
            scene: 'Opening',
            shot_number: 1,
            description: 'Aerial drone shot of factory exterior at sunrise',
            shot_type: 'Wide',
            camera_movement: 'Slow reveal',
            duration_seconds: 8,
            notes: 'Golden hour lighting essential',
            status: 'completed',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Opening',
            shot_number: 2,
            description: 'Company logo on building facade',
            shot_type: 'Medium',
            camera_movement: 'Static',
            duration_seconds: 3,
            notes: '',
            status: 'completed',
            priority: 'medium'
          },
          {
            id: randomUUID(),
            scene: 'Production Line',
            shot_number: 3,
            description: 'Workers operating organic processing equipment',
            shot_type: 'Medium',
            camera_movement: 'Gimbal tracking',
            duration_seconds: 12,
            notes: 'Show attention to detail and cleanliness',
            status: 'completed',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Production Line',
            shot_number: 4,
            description: 'Close-up of products on conveyor belt',
            shot_type: 'Close-up',
            camera_movement: 'Static with shallow DOF',
            duration_seconds: 6,
            notes: 'Macro lens, focus rack',
            status: 'completed',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Product Showcase',
            shot_number: 5,
            description: 'New organic product line arranged on table',
            shot_type: 'Close-up',
            camera_movement: 'Slow dolly',
            duration_seconds: 10,
            notes: 'Controlled studio lighting',
            status: 'in_progress',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Testimonials',
            shot_number: 6,
            description: 'Customer interview - healthy family cooking',
            shot_type: 'Medium Close-up',
            camera_movement: 'Static',
            duration_seconds: 20,
            notes: 'Kitchen setting, natural light',
            status: 'pending',
            priority: 'medium'
          }
        ],
        created_at: new Date('2026-01-12').toISOString(),
        updated_at: new Date('2026-02-08').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[6].id, // Hotel Tour
        shots: [
          {
            id: randomUUID(),
            scene: 'Exterior',
            shot_number: 1,
            description: 'Hotel exterior from marina at golden hour',
            shot_type: 'Wide',
            camera_movement: 'Drone orbit',
            duration_seconds: 12,
            notes: 'Show luxury yachts in foreground',
            status: 'pending',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Lobby',
            shot_number: 2,
            description: 'Grand lobby entrance and reception',
            shot_type: 'Wide',
            camera_movement: 'Gimbal push-in',
            duration_seconds: 8,
            notes: 'Showcase chandelier and marble floors',
            status: 'pending',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Rooms',
            shot_number: 3,
            description: 'Suite overview - living area',
            shot_type: 'Wide',
            camera_movement: 'Slow pan',
            duration_seconds: 10,
            notes: '',
            status: 'pending',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Rooms',
            shot_number: 4,
            description: 'Bedroom with sea view through balcony',
            shot_type: 'Medium',
            camera_movement: 'Dolly reveal',
            duration_seconds: 8,
            notes: 'Early morning light ideal',
            status: 'pending',
            priority: 'high'
          },
          {
            id: randomUUID(),
            scene: 'Amenities',
            shot_number: 5,
            description: 'Rooftop infinity pool at sunset',
            shot_type: 'Wide',
            camera_movement: 'Static then drone pull-back',
            duration_seconds: 15,
            notes: 'KEY SHOT - showcase sunset view',
            status: 'pending',
            priority: 'urgent'
          },
          {
            id: randomUUID(),
            scene: 'Restaurant',
            shot_number: 6,
            description: 'Chef preparing signature dish',
            shot_type: 'Close-up',
            camera_movement: 'Gimbal follow',
            duration_seconds: 12,
            notes: 'Coordinate with executive chef',
            status: 'pending',
            priority: 'medium'
          }
        ],
        created_at: new Date('2026-02-10').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      }
    ];

    const { error: shotListsError } = await supabase.from('shot_lists').insert(shotLists);
    if (shotListsError) handleError(shotListsError, 'inserting shot lists');

    log(`Created ${shotLists.length} shot lists`, 'success');

    // ========================================
    // 15. INSERT CONCEPT NOTES
    // ========================================
    log('\n📝 Inserting concept notes...');

    const conceptNotes = [
      {
        id: randomUUID(),
        project_id: projects[1].id, // Summer Islands
        title: 'Creative Vision - Island Series',
        content: `<h2>Overall Concept</h2>
<p>Create a dreamy, aspirational visual journey through Greece's most beautiful islands. Each video should feel like a love letter to the destination.</p>

<h3>Visual Style</h3>
<ul>
<li><strong>Color Palette:</strong> Rich blues, warm golds, whitewashed architecture</li>
<li><strong>Mood:</strong> Romantic, serene, adventurous</li>
<li><strong>Pacing:</strong> Slow, contemplative - let moments breathe</li>
</ul>

<h3>Music Direction</h3>
<p>Looking for instrumental tracks with Greek influences - bouzouki, acoustic guitar. Think café music meets cinematic score.</p>

<h3>Shot Ideas</h3>
<ul>
<li>Golden hour shots of iconic blue dome churches</li>
<li>Underwater shots in crystal-clear bays</li>
<li>Local artisans and traditional crafts</li>
<li>Sunset dining scenes with Aegean views</li>
<li>Narrow cobblestone streets with bougainvillea</li>
</ul>

<h3>Reference Films</h3>
<p>Before Midnight (2013) - Greece scenery<br/>
Mamma Mia aesthetic but more sophisticated<br/>
Tourism Australia "Dundee" campaign - high production value</p>`,
        attachments: [
          {
            id: randomUUID(),
            name: 'Islands_Mood_Board.pdf',
            url: 'attachments/islands-moodboard.pdf',
            size: 3145728,
            type: 'application/pdf'
          }
        ],
        created_at: new Date('2026-02-03').toISOString(),
        updated_at: new Date('2026-02-10').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[0].id, // Spring Product Launch
        title: 'Brand Guidelines & Messaging',
        content: `<h2>Hellas Foods Brand Identity</h2>

<h3>Key Messages</h3>
<ul>
<li>50 years of quality and tradition</li>
<li>New organic line represents innovation while respecting heritage</li>
<li>"From Greek soil to Greek tables"</li>
</ul>

<h3>Visual Requirements</h3>
<ul>
<li><strong>Brand Colors:</strong> Green (#2D5016), Gold (#DAA520), White</li>
<li><strong>Logo:</strong> Must appear in first 5 seconds and end card</li>
<li><strong>Typography:</strong> Use company font "Avenir Next" for all text overlays</li>
</ul>

<h3>Tone</h3>
<p>Professional yet warm. Show the human side of production while emphasizing quality control and modern facilities.</p>

<h3>Client Feedback from Kickoff</h3>
<blockquote>
<p>"We want customers to see that organic doesn't mean compromising on taste or quality. Show our commitment to sustainability but don't make it preachy."</p>
</blockquote>`,
        attachments: [
          {
            id: randomUUID(),
            name: 'Hellas_Foods_Brand_Guidelines.pdf',
            url: 'attachments/hellas-brand-guide.pdf',
            size: 2097152,
            type: 'application/pdf'
          }
        ],
        created_at: new Date('2026-01-10').toISOString(),
        updated_at: new Date('2026-01-12').toISOString()
      },
      {
        id: randomUUID(),
        project_id: projects[3].id, // Anniversary Documentary
        title: 'Documentary Structure & Interview Questions',
        content: `<h2>50th Anniversary Documentary - Structure</h2>

<h3>Narrative Arc (3 Acts)</h3>

<p><strong>Act 1: The Beginning (1976-1990)</strong></p>
<ul>
<li>Founder interviews about starting the company</li>
<li>Restored 8mm footage from early factory days</li>
<li>First product launches and market entry</li>
</ul>

<p><strong>Act 2: Growth & Challenges (1990-2010)</strong></p>
<ul>
<li>Expansion into new markets</li>
<li>Economic crisis of 2008 - how they adapted</li>
<li>Family succession and new leadership</li>
</ul>

<p><strong>Act 3: Modern Era & Future (2010-Present)</strong></p>
<ul>
<li>Sustainability initiatives and organic transition</li>
<li>Current team and modern facilities</li>
<li>Vision for next 50 years</li>
</ul>

<h3>Interview Subjects</h3>
<ul>
<li>Founder (age 82) - needs comfortable seating, natural light</li>
<li>Current CEO (daughter)</li>
<li>5 long-term employees (20+ years each)</li>
<li>3 customer testimonials</li>
</ul>

<h3>Key Interview Questions</h3>
<ol>
<li>What was the initial vision when the company started?</li>
<li>What moment made you most proud?</li>
<li>What was the biggest challenge overcome?</li>
<li>How has Greek food culture changed over 50 years?</li>
<li>What does the future hold?</li>
</ol>`,
        attachments: [],
        created_at: new Date('2025-11-05').toISOString(),
        updated_at: new Date('2025-11-20').toISOString()
      }
    ];

    const { error: conceptNotesError } = await supabase.from('concept_notes').insert(conceptNotes);
    if (conceptNotesError) handleError(conceptNotesError, 'inserting concept notes');

    log(`Created ${conceptNotes.length} concept notes`, 'success');

    // ========================================
    // 16. INSERT ACTIVITY LOG
    // ========================================
    log('\n📊 Inserting activity log entries...');

    const activityLog = [
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        action: 'uploaded_deliverable',
        entity_type: 'deliverable',
        entity_id: deliverables[1].id,
        metadata: {
          project_title: 'Company Anniversary Documentary',
          deliverable_title: '50th Anniversary Documentary - Review Cut',
          file_size: '4GB'
        },
        created_at: new Date('2026-02-09T17:45:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: clientUserId,
        action: 'viewed_invoice',
        entity_type: 'invoice',
        entity_id: invoices[3].id,
        metadata: {
          invoice_number: 'INV-2026-003',
          amount: '€3,200'
        },
        created_at: new Date('2026-02-10T11:22:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        action: 'created_project',
        entity_type: 'project',
        entity_id: projects[6].id,
        metadata: {
          project_title: 'Hotel Tour & Amenities Video',
          client_name: 'Marina Bay Hotel'
        },
        created_at: new Date('2026-02-10T14:00:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: clientUserId,
        action: 'signed_contract',
        entity_type: 'contract',
        entity_id: contracts[0].id,
        metadata: {
          contract_title: 'Spring Product Launch - Production Agreement',
          project_title: 'Spring Product Launch 2026'
        },
        created_at: new Date('2026-01-10T09:15:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        action: 'sent_invoice',
        entity_type: 'invoice',
        entity_id: invoices[0].id,
        metadata: {
          invoice_number: 'INV-2026-001',
          client_name: 'Hellas Foods SA',
          amount: '€12,400'
        },
        created_at: new Date('2026-02-01T10:30:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        action: 'completed_task',
        entity_type: 'task',
        entity_id: tasks[3].id,
        metadata: {
          task_title: 'Factory B-roll footage captured',
          project_title: 'Spring Product Launch 2026'
        },
        created_at: new Date('2026-01-26T18:20:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        action: 'converted_filming_request',
        entity_type: 'filming_request',
        entity_id: filmingRequests[0].id,
        metadata: {
          request_title: 'Hotel Tour & Amenities Video',
          converted_to_project: 'Hotel Tour & Amenities Video'
        },
        created_at: new Date('2026-02-10T13:55:00Z').toISOString()
      }
    ];

    const { error: activityLogError } = await supabase.from('activity_log').insert(activityLog);
    if (activityLogError) handleError(activityLogError, 'inserting activity log');

    log(`Created ${activityLog.length} activity log entries`, 'success');

    // ========================================
    // 17. INSERT NOTIFICATIONS
    // ========================================
    log('\n🔔 Inserting notifications...');

    const notifications = [
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        type: 'invoice_overdue',
        title: 'Invoice Overdue',
        body: 'Invoice INV-2025-089 for Hellas Foods SA is now overdue (€18,000)',
        read: false,
        action_url: `/admin/invoices/${invoices[2].id}`,
        created_at: new Date('2026-01-06T08:00:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        type: 'new_message',
        title: 'New Message',
        body: 'Dimitris Papadopoulos sent a message on "Spring Product Launch 2026"',
        read: true,
        action_url: `/admin/projects/${projects[0].id}/messages`,
        created_at: new Date('2026-02-09T16:30:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: clientUserId,
        type: 'deliverable_uploaded',
        title: 'New Deliverable Available',
        body: 'Anniversary Documentary - Review Cut is ready for your review',
        read: false,
        action_url: `/client/projects/${projects[3].id}/deliverables`,
        created_at: new Date('2026-02-09T17:45:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        type: 'contract_signed',
        title: 'Contract Signed',
        body: 'Aegean Travel Group signed the contract for "Summer Islands Campaign"',
        read: true,
        action_url: `/admin/projects/${projects[1].id}/contracts`,
        created_at: new Date('2026-02-03T13:20:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: ADMIN_USER_ID,
        type: 'new_filming_request',
        title: 'New Filming Request',
        body: 'Wedding Videography request received for June 14, 2026 in Mykonos',
        read: false,
        action_url: `/admin/filming-requests/${filmingRequests[1].id}`,
        created_at: new Date('2026-02-09T19:30:00Z').toISOString()
      },
      {
        id: randomUUID(),
        user_id: clientUserId,
        type: 'invoice_sent',
        title: 'New Invoice',
        body: 'Invoice INV-2026-001 is ready for payment (€12,400)',
        read: true,
        action_url: `/client/invoices/${invoices[0].id}`,
        created_at: new Date('2026-02-01T10:30:00Z').toISOString()
      }
    ];

    const { error: notificationsError } = await supabase.from('notifications').insert(notifications);
    if (notificationsError) handleError(notificationsError, 'inserting notifications');

    log(`Created ${notifications.length} notifications`, 'success');

    // ========================================
    // SEEDING COMPLETE
    // ========================================
    log('\n🎉 Seeding completed successfully!', 'success');
    log('\n📈 Summary:');
    log(`   • 1 client auth user created`);
    log(`   • ${clients.length} clients`);
    log(`   • ${projects.length} projects`);
    log(`   • ${tasks.length} tasks`);
    log(`   • ${deliverables.length} deliverables`);
    log(`   • ${annotations.length} video annotations`);
    log(`   • ${invoices.length} invoices`);
    log(`   • ${expenses.length} expenses`);
    log(`   • ${messages.length} messages`);
    log(`   • ${contractTemplates.length} contract templates`);
    log(`   • ${contracts.length} contracts`);
    log(`   • ${filmingRequests.length} filming requests`);
    log(`   • ${equipmentLists.length} equipment lists`);
    log(`   • ${shotLists.length} shot lists`);
    log(`   • ${conceptNotes.length} concept notes`);
    log(`   • ${activityLog.length} activity log entries`);
    log(`   • ${notifications.length} notifications`);

    log('\n🔐 Login Credentials:');
    log(`   Admin: admin@devremedia.gr`);
    log(`   Client: client@demo.gr / the SEED_CLIENT_PASSWORD you supplied`);

    log('\n✅ Your cloud database is now populated with realistic demo data!');

  } catch (error) {
    log('\n❌ Seeding failed!', 'error');
    console.error(error);
    process.exit(1);
  }
}

// Run the seeder
seed();
