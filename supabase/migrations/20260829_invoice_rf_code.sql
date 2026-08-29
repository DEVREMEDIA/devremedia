-- Πληρωμή χωρίς κάρτα μέσα στην εφαρμογή (issue #93).
--
-- ΓΙΑΤΙ ΤΟ ΟΝΟΜΑ: οι μεταναστεύσεις εφαρμόζονται σε λεξικογραφική σειρά ονόματος.
-- Το `20260729_phase0_security_rls.sql` σορτάρει μετά από κάθε `000xx_*.sql`, και
-- αυτό το αρχείο πρέπει να έρθει ΜΕΤΑ από εκείνο (γράφει πολιτικές που εκείνο δεν
-- ξέρει). Γι' αυτό κρατά την ίδια ημερομηνιακή ονοματολογία και όχι `00070_`.

-- ============================================================================
-- 1. invoices.rf_code — ο κωδικός πληρωμής RF του τιμολογίου
--    Ελεύθερο κείμενο, χωρίς έλεγχο μορφής: ο κωδικός έρχεται από την τράπεζα
--    και δεν είναι δουλειά της βάσης να μαντεύει τη μορφή του.
-- ============================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS rf_code text;

COMMENT ON COLUMN public.invoices.rf_code IS
  'Κωδικός πληρωμής RF, όπως τον δίνει η τράπεζα. NULL όσο δεν έχει εκδοθεί.';

-- ============================================================================
-- 2. public.settings — ο πίνακας key/value που ο κώδικας ήδη διάβαζε
--    (`getCompanySettings`) χωρίς καμία μετανάστευση στο repo να τον φτιάχνει.
--
--    ΠΡΟΣΒΑΣΗ: ΜΟΝΟ διαχειριστές, σε ανάγνωση και σε γραφή. Η γραμμή
--    `company_settings` κουβαλά ΟΛΟ το προφίλ της εταιρείας (ΑΦΜ, ΔΟΥ, διεύθυνση)
--    — δεν ανοίγει σε πελάτες ούτε για ανάγνωση. Ο πελάτης χρειάζεται μόνο τρία
--    πεδία τραπεζικού λογαριασμού, και τα παίρνει από την ενέργεια
--    `getBankDetails()` (src/lib/actions/settings.ts), που διαβάζει με τον admin
--    client και επιστρέφει ΜΟΝΟ αυτά τα τρία. Έτσι το φίλτρο ζει σε ένα σημείο
--    που διαβάζεται, αντί για μια πολιτική RLS που θα εξέθετε ολόκληρο το JSON.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage settings" ON public.settings;

CREATE POLICY "Admins manage settings"
ON public.settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (select auth.uid())
    AND up.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (select auth.uid())
    AND up.role IN ('super_admin', 'admin')
  )
);
