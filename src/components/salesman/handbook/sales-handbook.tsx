'use client';

import { useState } from 'react';
import {
  Package,
  ListChecks,
  MessageSquareWarning,
  FileText,
  Mail,
  Trophy,
  Euro,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Ban,
  Briefcase,
  Target,
  Megaphone,
  Users,
  ChevronRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const tToast = useTranslations('toast');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(tToast('copySuccess'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2 hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      {label || 'Copy'}
    </Button>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="rounded-xl bg-amber-500/10 p-2.5">
        <Icon className="h-5 w-5 text-amber-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}

/* ============================
   TAB: Pitch & Identity
   ============================ */
function PitchTab() {
  return (
    <div className="space-y-8">
      <SectionHeader
        icon={Megaphone}
        title="Ποιοι Είμαστε & Τι Κάνουμε"
        description="Η ταυτότητα της Devre Media"
      />

      {/* One-liner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">One-Liner</CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-4 border-primary pl-4 italic text-lg">
            Η Devre Media είναι η ομάδα που αναλαμβάνει να χτίσει ολοκληρωμένα την εικόνα της
            επιχείρησης με video &ndash; από τα καθημερινά social μέχρι τα μεγάλα διαφημιστικά.
          </blockquote>
          <div className="mt-3">
            <CopyButton
              text="Η Devre Media είναι η ομάδα που αναλαμβάνει να χτίσει ολοκληρωμένα την εικόνα της επιχείρησης με video – από τα καθημερινά social μέχρι τα μεγάλα διαφημιστικά."
              label="Copy One-Liner"
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Pitch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Αναλυτικό Pitch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            Η Devre Media είναι μια εταιρία παραγωγής video και διαφημιστικού περιεχομένου που
            ειδικεύεται στο να χτίζει ολόκληρη την εικόνα μιας επιχείρησης, όχι απλά να βγάζει
            μερικά βιντεάκια.
          </p>
          <p>Στην αγορά σήμερα υπάρχουν δύο άκρα:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>οι κλασικοί videographers/cinematographers με βαριά κάμερα</li>
            <li>και οι content creators με το κινητό</li>
          </ul>
          <p className="font-medium">Εμείς είμαστε στη μέση:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>δουλεύουμε με mobile περιβάλλον & ελαφρύ εξοπλισμό για να είμαστε πολύ γρήγοροι</li>
            <li>
              αλλά ακολουθούμε όλους τους κανόνες του cinematography, ώστε το content να είναι
              αισθητικά ανώτερο
            </li>
          </ul>
          <p>
            Αναλαμβάνουμε μηνιαία πακέτα για social, podcasts, vlog, αλλά και μεγαλύτερες παραγωγές
            όπως εταιρικά video και διαφημιστικά. Δεν ερχόμαστε απλώς να τραβήξουμε πλάνα &ndash;
            σχεδιάζουμε μαζί με τον πελάτη θεματολογία, γυρίσματα και στρατηγική εικόνας.
          </p>
          <p>
            Δουλεύουμε ήδη με brands όπως <strong>Μαύρη Θάλασσα</strong> (60 reels, 3 vlog, 6
            podcasts/μήνα), <strong>Almeco</strong>, <strong>Technomat</strong>,{' '}
            <strong>Ophthalmica</strong>, <strong>MotoMarket</strong>, <strong>Sky Venue</strong>,
            καθώς και <strong>UFC</strong>, <strong>AJP</strong>, <strong>REMAX Hellas</strong>.
          </p>
          <div className="rounded-lg bg-muted p-4 mt-4">
            <p className="font-medium mb-1">Φιλοσοφία:</p>
            <p className="italic">
              &laquo;Είμαστε δίπλα στον πελάτη σαν άνθρωποι και συνεργάτες, αλλά δουλεύουμε με
              ξεκάθαρους κανόνες, συμβόλαια και χρόνους παράδοσης. Οι καλοί λογαριασμοί κάνουν τους
              καλούς φίλους.&raquo;
            </p>
          </div>
          <div className="mt-2">
            <CopyButton
              text={`Η Devre Media είναι μια εταιρία παραγωγής video και διαφημιστικού περιεχομένου που ειδικεύεται στο να χτίζει ολόκληρη την εικόνα μιας επιχείρησης, όχι απλά να βγάζει μερικά βιντεάκια.\n\nΣτην αγορά σήμερα υπάρχουν δύο άκρα: οι κλασικοί videographers με βαριά κάμερα, και οι content creators με το κινητό. Εμείς είμαστε στη μέση: δουλεύουμε με mobile περιβάλλον & ελαφρύ εξοπλισμό για να είμαστε πολύ γρήγοροι, αλλά ακολουθούμε όλους τους κανόνες του cinematography, ώστε το content να είναι αισθητικά ανώτερο.\n\nΑναλαμβάνουμε μηνιαία πακέτα για social, podcasts, vlog, αλλά και μεγαλύτερες παραγωγές. Δουλεύουμε ήδη με brands όπως Μαύρη Θάλασσα, Almeco, Technomat, Ophthalmica, MotoMarket, Sky Venue, UFC, AJP, REMAX Hellas.`}
              label="Copy Pitch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vision */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Όραμα</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Πηγαίνουμε προς agency μοντέλο. Θέλουμε καθολική ανάληψη της εικόνας (social, YouTube,
            website, TV, radio κ.λπ.) και προτιμάμε ετήσιες συνεργασίες αντί για one-off projects.
          </p>
        </CardContent>
      </Card>

      {/* Target Clients */}
      <SectionHeader icon={Target} title="Ιδανικοί Πελάτες & Στόχευση" />
      <Card>
        <CardContent className="pt-6 space-y-4 text-sm">
          <p>
            Θέλουμε <strong>high-end &laquo;κράχτες&raquo;</strong> που ανεβάζουν το portfolio και
            μπορούν να κλιμακώσουν τη συνεργασία σε μεγάλα πακέτα (εταιρικά, podcasts,
            διαφημιστικά).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium mb-2">Γεωγραφική Στόχευση</p>
              <div className="flex flex-wrap gap-2">
                <Badge>1. Θεσσαλονίκη</Badge>
                <Badge variant="secondary">2. Αθήνα</Badge>
                <Badge variant="outline">Εξωτερικό (προοπτική)</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium mb-2">Industries</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Γαστρονομία / Εστίαση</Badge>
                <Badge variant="secondary">HORECA / Έπιπλα / B2B</Badge>
                <Badge variant="secondary">Κλινικές / Ιατρικά</Badge>
                <Badge variant="secondary">Retail / Brands</Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-destructive/10 p-4 mt-4">
            <p className="font-medium text-destructive mb-1">Δεν αναλαμβάνουμε:</p>
            <p>
              Πορνογραφικό / adult περιεχόμενο. Για οτιδήποτε &laquo;γκρίζο&raquo;, ο πωλητής ρωτά
              πρώτα τον Άγγελο.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tone */}
      <SectionHeader icon={Users} title="Τόνος Φωνής Πωλητή" />
      <Card>
        <CardContent className="pt-6 space-y-3 text-sm">
          <p>
            <strong>Φιλικός, ανθρώπινος, αλλά επαγγελματικός και ξεκάθαρος.</strong>
          </p>
          <blockquote className="border-l-4 border-primary pl-4 italic">
            &laquo;Είμαστε δίπλα σου, είμαστε φίλοι σου, αλλά δουλεύουμε με συγκεκριμένο τρόπο
            &ndash; οι καλοί λογαριασμοί κάνουν τους καλούς φίλους.&raquo;
          </blockquote>
          <p>
            Αποφεύγεται το aggressive selling. Υπάρχει αυτοπεποίθηση και ήπιο FOMO (top πελάτες,
            περιορισμένα slots).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Packages & Pricing
   ============================ */
function PackagesTab() {
  return (
    <div className="space-y-8">
      <SectionHeader
        icon={Package}
        title="Πακέτα & Υπηρεσίες"
        description="Όλα τα πακέτα με τιμές και λεπτομέρειες"
      />

      {/* Social Media Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Μηνιαία Πακέτα &ndash; Social Media Video</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Βασικό</CardDescription>
              <CardTitle className="text-3xl">
                1.170<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                8 video / μήνα
              </Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> 2 ημέρες γυρισμάτων
                  (έως 6 ώρες)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Brief με προτεινόμενη
                  θεματολογία
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα + μοντάζ
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Copyright-free
                  μουσική
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Υπότιτλοι
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Drone
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">~146,25&euro;/video</p>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Δημοφιλές</CardDescription>
                <Badge>Προτεινόμενο</Badge>
              </div>
              <CardTitle className="text-3xl">
                1.350<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                12 video / μήνα
              </Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> 2 ημέρες γυρισμάτων
                  (έως 6 ώρες/ημέρα)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Brief με προτεινόμενη
                  θεματολογία
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα + μοντάζ
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Copyright-free
                  μουσική
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Υπότιτλοι
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Drone
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">~112,5&euro;/video</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Premium</CardDescription>
              <CardTitle className="text-3xl">
                2.200<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                20 video / μήνα
              </Badge>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> 4 ημέρες γυρισμάτων
                  (έως 6 ώρες/ημέρα)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Brief με προτεινόμενη
                  θεματολογία
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα + μοντάζ
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Copyright-free
                  μουσική
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Υπότιτλοι
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Drone
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">~112&euro;/video</p>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>Extras:</strong> Thumbnails (ως έξτρα χρέωση ή δώρο κατόπιν συνεννόησης). Στόχος
          πώλησης: 8 ή 12 video/μήνα.
        </p>
      </div>

      <Separator />

      {/* Podcast Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Μηνιαία Πακέτα &ndash; Podcast</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">
                800<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                2 επεισόδια / μήνα
              </Badge>
              <p className="text-sm text-muted-foreground">400&euro;/episode</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα με 3 κάμερες
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Full μοντάζ
                  επεισοδίων
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">
                1.200<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                4 επεισόδια / μήνα
              </Badge>
              <p className="text-sm text-muted-foreground">300&euro;/episode</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα με 3 κάμερες
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Full μοντάζ
                  επεισοδίων
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">
                1.500<span className="text-lg font-normal text-muted-foreground">&euro;/μήνα</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-lg font-semibold">
                6 επεισόδια / μήνα
              </Badge>
              <p className="text-sm text-muted-foreground">250&euro;/episode</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Γύρισμα με 3 κάμερες
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> Full μοντάζ
                  επεισοδίων
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          <strong>Extras:</strong> Thumbnails, short clips από τα podcast επεισόδια.
        </p>
      </div>

      <Separator />

      {/* Event Packages */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Event &ndash; On-the-spot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">
                ~650<span className="text-lg font-normal text-muted-foreground">&euro;</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-lg font-semibold">
                Πακέτο 3 video
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Παράδοση: ίδια μέρα ή μέχρι το επόμενο πρωί
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl">
                ~850<span className="text-lg font-normal text-muted-foreground">&euro;</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-lg font-semibold">
                Πακέτο 5 video
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Παράδοση: ίδια μέρα ή μέχρι το επόμενο πρωί
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* One-off Productions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Μεγάλες / One-off Παραγωγές</h3>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <p>Εταιρικά video, διαφημιστικά, μεγαλύτερες παραγωγές.</p>
            <p>
              <strong>Τιμολόγηση:</strong> από 800&euro; και πάνω, κατόπιν αναλυτικής προσφοράς.
            </p>
            <div className="mt-4">
              <p className="font-medium mb-2">Upsells:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Extra ημέρα γυρισμάτων</Badge>
                <Badge variant="outline">Σενάριο / Copywriting</Badge>
                <Badge variant="outline">Φωτογραφίσεις</Badge>
                <Badge variant="outline">Drone (περιλαμβάνεται!)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============================
   TAB: Sales Process
   ============================ */
function ProcessTab() {
  const miniScript = `Γεια σας, είμαι ο/η … από την Devre Media. Είμαστε εταιρία παραγωγής video & διαφημιστικού περιεχομένου – δουλεύουμε με brands όπως Μαύρη Θάλασσα, Almeco, Technomat, Ophthalmica. Θα ήθελα να κλείσουμε ένα σύντομο ραντεβού για να δω τους στόχους σας και να σας προτείνω ένα πλάνο που να βγάζει νόημα για τη δική σας επιχείρηση.`;

  const followUpScript = `Ήθελα να βεβαιωθώ ότι λάβατε την πρόταση και να δω αν υπάρχει κάτι που θέλετε να προσαρμόσουμε. Στόχος μας είναι να φτιάξουμε ένα πλάνο που να σας βγάζει πραγματική απόδοση και να είμαστε δίπλα σας όλο τον χρόνο.`;

  const closingScript = `Ειλικρινά νιώθω ότι ταιριάζουμε σαν φιλοσοφία και πιστεύω ότι μπορούμε να σας πάμε ένα επίπεδο πάνω στην εικόνα σας. Προτείνω να ξεκινήσουμε για 3 μήνες με το πακέτο 8 ή 12 βίντεο τον μήνα και να το δούμε στην πράξη. Θα σας στείλω την πρόταση με όλα αναλυτικά και, μόλις το δείτε, ανυπομονώ να κλειδώσουμε ημερομηνίες για τα πρώτα γυρίσματα.`;

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={ListChecks}
        title="Διαδικασία Πώλησης"
        description="Βήμα-βήμα από την πρώτη επαφή μέχρι το κλείσιμο"
      />

      {/* Step 1: First Contact */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              1
            </div>
            <CardTitle className="text-base">Πρώτη Επαφή</CardTitle>
          </div>
          <CardDescription>Στόχος: να δείξουμε σοβαρότητα & οργάνωση</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium mb-2 text-sm">Mini Script:</p>
            <p className="text-sm italic">&laquo;{miniScript}&raquo;</p>
          </div>
          <CopyButton text={miniScript} label="Copy Script" />
          <p className="text-sm text-muted-foreground">
            Κλείνουμε Discovery Meeting 30&ndash;45 λεπτών (live ή online).
          </p>
        </CardContent>
      </Card>

      {/* Step 2: Discovery Meeting */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              2
            </div>
            <CardTitle className="text-base">Discovery Meeting &ndash; Ερωτήσεις</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {[
              'Ποιος είναι ο βασικός σας στόχος με το video και το περιεχόμενο;',
              'Τι κάνετε σήμερα για τα social / την εικόνα σας; Τι δουλεύει και τι όχι;',
              'Ποιοι είναι οι βασικοί σας ανταγωνιστές; Υπάρχει brand που ζηλεύετε θετικά;',
              'Πώς ονειρεύεστε να είναι η διαδικτυακή εικόνα σας σε 1–2 χρόνια;',
              'Υπάρχει περιεχόμενο (video, λογαριασμοί, creators) που νιώθετε ότι σας αντιπροσωπεύει;',
              'Σε ποιες πλατφόρμες θέλετε να δώσουμε βάση;',
              'Πόσο συχνά θα θέλατε να ανεβαίνει νέο περιεχόμενο;',
              'Τι budget έχετε στο μυαλό σας για σταθερή μηνιαία παραγωγή; (έστω ένα εύρος)',
            ].map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-lg bg-muted p-4 mt-4">
            <p className="text-sm">
              Στο τέλος ο πωλητής συνοψίζει (<em>&laquo;Άρα, αν κατάλαβα καλά...&raquo;</em>) και
              προτείνει 1&ndash;2 πακέτα (συνήθως 8 ή 12 video).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Proposal Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              3
            </div>
            <CardTitle className="text-base">Πρόταση / Email</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Το email περιλαμβάνει:</p>
          <ul className="space-y-1">
            {[
              'Περίληψη των αναγκών του πελάτη',
              '2–3 επιλογές πακέτων (4/8/12 video) με τιμές και κόστος ανά video',
              'Σύντομη παρουσίαση Devre (ποιοι είμαστε + key clients)',
              'Clear επόμενα βήματα: συμφωνητικό, 50% προκαταβολή, κλείδωμα ημερομηνιών',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Step 4: Follow-up */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              4
            </div>
            <CardTitle className="text-base">Follow-up (1&ndash;3 μέρες μετά)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm italic">&laquo;{followUpScript}&raquo;</p>
          </div>
          <CopyButton text={followUpScript} label="Copy Follow-up" />
        </CardContent>
      </Card>

      {/* Step 5: Closing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
              5
            </div>
            <CardTitle className="text-base">Κλείσιμο (Closing)</CardTitle>
          </div>
          <CardDescription>Φιλικό κλείσιμο με αυτοπεποίθηση & FOMO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm italic">&laquo;{closingScript}&raquo;</p>
          </div>
          <CopyButton text={closingScript} label="Copy Closing" />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Objections
   ============================ */
function ObjectionsTab() {
  const objections = [
    {
      question: 'Είναι ακριβό.',
      answer:
        'Εξηγούμε ότι δεν πουλάμε μεμονωμένα βιντεάκια αλλά μηχανή παραγωγής περιεχομένου και στρατηγική εικόνας. Αναφέρουμε case studies (Μαύρη Θάλασσα, Almeco, Technomat, Ophthalmica).',
    },
    {
      question: 'Έχουμε ήδη κάποιον που μας κάνει video.',
      answer:
        'Τονίζουμε ότι είναι θετικό, αλλά εμείς ερχόμαστε ως στρατηγικός συνεργάτης εικόνας, όχι απλά κάμερα. Μπορεί να τρέξει δοκιμαστικά παράλληλη συνεργασία για 2–3 μήνες.',
    },
    {
      question: 'Δεν έχουμε χρόνο για γύρισμα.',
      answer: 'Εξηγούμε ότι σε 1–2 ημέρες γυρισμάτων βγάζουμε content για ολόκληρο τον μήνα.',
    },
    {
      question: 'Δεν ξέρω αν τα video φέρνουν δουλειά.',
      answer:
        "Εξηγούμε τη σημασία brand, αναγνωρισιμότητας, engagement, followers και πωλήσεων σε βάθος χρόνου. Γι' αυτό προτείνουμε minimum 3 μήνες.",
    },
    {
      question: 'Να το σκεφτώ / να μιλήσω με τον συνέταιρο.',
      answer: 'Σεβόμαστε τον χρόνο, αλλά κλείνουμε συγκεκριμένο follow-up call σε 2–3 μέρες.',
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={MessageSquareWarning}
        title="Αντιρρήσεις & Απαντήσεις"
        description="Πώς απαντάμε στις πιο συνηθισμένες αντιρρήσεις"
      />

      <Accordion type="single" collapsible className="w-full">
        {objections.map((obj, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left">
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold dark:bg-orange-900 dark:text-orange-300">
                  {i + 1}
                </span>
                <span>&laquo;{obj.question}&raquo;</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-10 text-sm leading-relaxed">{obj.answer}</div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Τι ΔΕΝ υπόσχεται ποτέ ο πωλητής
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">&#10005;</span>
              <span>Δεν υπόσχεται εγγυημένα views, followers, κρατήσεις ή πωλήσεις</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">&#10005;</span>
              <span>Δεν υπόσχεται χρόνους παράδοσης εκτός των επίσημων</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">&#10005;</span>
              <span>
                Δεν πουλά υπηρεσίες που δεν προσφέρουμε ακόμη χωρίς έγκριση (π.χ. full ads
                management)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">&#10005;</span>
              <span>
                Για οτιδήποτε δεν είναι ξεκάθαρο, ενημερώνει τον πελάτη ότι θα το διευκρινίσει με
                τον Άγγελο και θα επανέλθει
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Policies
   ============================ */
function PoliciesTab() {
  return (
    <div className="space-y-8">
      <SectionHeader
        icon={FileText}
        title="Πολιτικές & Όροι"
        description="Revisions, χρόνοι, πληρωμές, ακυρώσεις"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revisions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Revisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1 κύκλος διορθώσεων ανά video</p>
            <p>Μέχρι 2 αλλαγές ανά video μέσα σε αυτόν τον κύκλο</p>
            <p className="text-muted-foreground">Επιπλέον αλλαγές: έξτρα χρέωση</p>
          </CardContent>
        </Card>

        {/* Delivery Times */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Χρόνοι Παράδοσης
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Social & Podcasts</span>
              <Badge variant="secondary">έως 7 εργάσιμες</Badge>
            </div>
            <div className="flex justify-between">
              <span>Event on-the-spot</span>
              <Badge variant="secondary">ίδια μέρα / επόμενο πρωί</Badge>
            </div>
            <div className="flex justify-between">
              <span>Μεγάλες παραγωγές</span>
              <Badge variant="secondary">έως 14 εργάσιμες</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Πληρωμές & Προκαταβολές
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">Γενικός κανόνας: 50% &ndash; 50%</p>
            <ul className="space-y-2">
              <li>
                <strong>Μηνιαία:</strong> 50% προκαταβολή για κλείδωμα ημερομηνιών, 50% στην τελική
                παράδοση
              </li>
              <li>
                <strong>Μεγάλες παραγωγές:</strong> 50% προκαταβολή με αποδοχή προσφοράς, 50% στην
                παράδοση
              </li>
              <li>
                <strong>Events:</strong> 50% για κλείδωμα ημερομηνίας, 50% εξόφληση την ημέρα του
                event
              </li>
            </ul>
            <p className="text-muted-foreground">
              Τρόποι: τραπεζική κατάθεση, IRIS (μετρητά μόνο σε events)
            </p>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Διάρκεια Συνεργασίας
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Minimum:</strong> 3 μήνες για μηνιαία πακέτα
            </p>
            <p>
              <strong>Ιδανικά:</strong> ετήσια συνεργασία για στρατηγική και σταθερή εικόνα
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cancellations */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-5 w-5 text-amber-600" />
            Ακυρώσεις / Αλλαγές Ημερομηνιών
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-1">Μηνιαία πακέτα:</p>
            <ul className="space-y-1">
              <li>
                Αλλαγή ημερομηνίας &gt; 7 ημέρες πριν:{' '}
                <strong className="text-green-600">δωρεάν</strong>, ανάλογα με διαθεσιμότητα
              </li>
              <li>
                Αλλαγή / ακύρωση &lt; 7 ημέρες πριν:{' '}
                <strong className="text-destructive">τέλος 150&euro; ανά ημέρα γυρίσματος</strong>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-1">Events:</p>
            <ul className="space-y-1">
              <li>
                Η προκαταβολή <strong className="text-destructive">δεν επιστρέφεται</strong> σε
                περίπτωση ακύρωσης
              </li>
              <li>Μεταφορά σε άλλη ημερομηνία μόνο κατόπιν συνεννόησης & διαθεσιμότητας</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Χρήση Υλικού σε Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Η Devre Media διατηρεί το δικαίωμα να χρησιμοποιεί επιλεγμένα αποσπάσματα από τις
            παραγωγές ως δείγμα δουλειάς (portfolio) σε website, social media & παρουσιάσεις, αφού
            πρώτα δημοσιευτεί το υλικό από τον πελάτη και πάντα με σεβασμό στο brand και την εικόνα
            του.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Case Studies
   ============================ */
function CaseStudiesTab() {
  const cases = [
    {
      name: 'Μαύρη Θάλασσα',
      description:
        'Ολοκληρωμένο πακέτο 60 reels, 3 vlog, 6 podcasts τον μήνα. Brand-κράχτης στη γαστρονομία.',
      tags: ['Γαστρονομία', '60 reels/μήνα', '3 vlog/μήνα', '6 podcasts/μήνα'],
      highlight: true,
    },
    {
      name: 'Ophthalmica',
      description: '8 video / μήνα, ενίσχυση εικόνας κλινικής αιχμής.',
      tags: ['Ιατρικά', '8 video/μήνα'],
      highlight: false,
    },
    {
      name: 'Technomat',
      description: 'Από 4 video / μήνα ανέβηκε σε 8 video / μήνα λόγω καλής απόδοσης.',
      tags: ['B2B', 'Upsell 4→8 video'],
      highlight: false,
    },
    {
      name: 'Almeco',
      description: '8 video / μήνα, ισχυρή παρουσία σε HORECA.',
      tags: ['HORECA', '8 video/μήνα'],
      highlight: false,
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={Trophy}
        title="Case Studies"
        description="Social proof για να πείσεις τον πελάτη"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((cs, i) => (
          <Card key={i} className={cs.highlight ? 'border-primary' : ''}>
            {cs.highlight && (
              <div className="bg-primary text-primary-foreground text-xs text-center py-1 font-medium rounded-t-lg">
                Top Client
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{cs.name}</CardTitle>
              <CardDescription>{cs.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cs.tags.map((tag, j) => (
                  <Badge key={j} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 text-sm">
          <p className="font-medium mb-2">Επίσης δουλεύουμε με:</p>
          <div className="flex flex-wrap gap-2">
            {['MotoMarket', 'Sky Venue', 'UFC', 'AJP', 'REMAX Hellas'].map((name) => (
              <Badge key={name} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Templates & Tools
   ============================ */
function TemplatesTab() {
  const proposalTemplate = `Καλησπέρα [ΟΝΟΜΑ],

Χάρηκα πολύ για τη συζήτησή μας και τον χρόνο που αφιερώσατε για να δούμε την εικόνα της [ΕΠΩΝΥΜΙΑ]. Όπως συζητήσαμε, ο βασικός σας στόχος είναι [ΠΕΡΙΓΡΑΦΗ ΣΤΟΧΟΥ].

Παρακάτω θα βρείτε ένα συνοπτικό πλάνο συνεργασίας με μηνιαία πακέτα παραγωγής video για τα social media:

- 4 video / μήνα – 650€
- 8 video / μήνα – 1.050€
- 12 video / μήνα – 1.350€

[Περιγραφή τι περιλαμβάνει κάθε πακέτο και προτεινόμενο πακέτο].

Χρόνος παράδοσης: έως 7 εργάσιμες ημέρες από το γύρισμα.
Πληρωμή: 50% προκαταβολή για κλείδωμα ημερομηνιών, 50% με την τελική παράδοση.

Ανυπομονώ να ξεκινήσουμε και να προγραμματίσουμε τα πρώτα γυρίσματα.

Με εκτίμηση,
Άγγελος
Devre Media`;

  const followUpTemplate = `Καλησπέρα [ΟΝΟΜΑ],

Ήθελα απλώς να βεβαιωθώ ότι λάβατε κανονικά την πρόταση συνεργασίας που σας έστειλα για τη [ΕΠΩΝΥΜΙΑ] και να δω αν υπάρχει κάτι που θα θέλατε να συζητήσουμε ή να προσαρμόσουμε.

Στόχος μας είναι να φτιάξουμε ένα πλάνο που να βγάζει νόημα για τη δική σας πραγματικότητα και να σας πάει ένα επίπεδο πάνω στην εικόνα σας.

Αν θέλετε, μπορούμε να κλείσουμε ένα σύντομο τηλεφώνημα 10' τις επόμενες μέρες, για να καταλήξουμε στο ιδανικό πακέτο.

Με εκτίμηση,
Άγγελος
Devre Media`;

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={Mail}
        title="Email Templates & Εργαλεία"
        description="Έτοιμα templates για αντιγραφή"
      />

      {/* Proposal Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template: Πρόταση Συνεργασίας</CardTitle>
          <CardDescription>
            Subject: Πρόταση συνεργασίας Devre Media &ndash; [ΕΠΩΝΥΜΙΑ]
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm font-mono leading-relaxed">
            {proposalTemplate}
          </pre>
          <CopyButton text={proposalTemplate} label="Copy Template" />
        </CardContent>
      </Card>

      {/* Follow-up Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template: Follow-up Email</CardTitle>
          <CardDescription>Subject: Επικοινωνία για την πρόταση συνεργασίας μας</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm font-mono leading-relaxed">
            {followUpTemplate}
          </pre>
          <CopyButton text={followUpTemplate} label="Copy Template" />
        </CardContent>
      </Card>

      <Separator />

      {/* Client Questionnaire */}
      <SectionHeader
        icon={FileText}
        title="Ερωτηματολόγιο Νέου Πελάτη"
        description="Ενδεικτική δομή ερωτηματολογίου (Google Form)"
      />

      <div className="space-y-4">
        {[
          {
            title: '1. Στοιχεία Επιχείρησης',
            items: [
              'Επωνυμία',
              'Υπεύθυνος επικοινωνίας',
              'Τηλέφωνο',
              'Email',
              'Website',
              'Social media links',
            ],
          },
          {
            title: '2. Τρέχουσα Εικόνα & Στόχοι',
            items: [
              'Περιγραφή επιχείρησης',
              'Βασικός στόχος με video',
              'Τι κάνουν σήμερα για social',
              'Ανταγωνιστές',
              'Brand που ζηλεύουν θετικά',
            ],
          },
          {
            title: '3. Όραμα & Ταυτότητα',
            items: [
              'Διαδικτυακή εικόνα σε 1–2 χρόνια',
              'Πώς θέλουν να τους ξέρουν',
              'Περιεχόμενο/creators που τους αντιπροσωπεύει',
            ],
          },
          {
            title: '4. Πλατφόρμες & Συχνότητα',
            items: [
              'Πλατφόρμες στόχευσης',
              'Συχνότητα νέου content',
              'Διαθεσιμότητα για γυρίσματα',
            ],
          },
          {
            title: '5. Budget & Είδος Συνεργασίας',
            items: [
              'Εύρος budget μηνιαίας παραγωγής',
              'Είδος περιεχομένου ενδιαφέροντος',
              'Τύπος συνεργασίας (μηνιαία, δοκιμαστική, event)',
            ],
          },
          {
            title: '6. Τεχνικά / Πρακτικά',
            items: [
              'Σημαντικό για χώρο/προσωπικό',
              'Τι ΔΕΝ θέλουν σε video',
              'Ιδανική ημερομηνία έναρξης',
            ],
          },
          {
            title: '7. Τελικές Σκέψεις',
            items: ['Τι θεωρούν επιτυχημένη συνεργασία σε 6–12 μήνες', 'Οτιδήποτε άλλο'],
          },
        ].map((section, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2 text-muted-foreground">
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================
   TAB: Commission & Targets
   ============================ */
function CommissionTab() {
  return (
    <div className="space-y-8">
      <SectionHeader icon={Euro} title="Αμοιβή & Στόχοι" description="Εσωτερικά στοιχεία πωλητή" />

      {/* Commission Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Βασική Προμήθεια (ανά νέο πελάτη μηνιαίου πακέτου)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">1ος πελάτης / μήνα</p>
              <p className="text-3xl font-bold mt-1">150&euro;</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-sm text-muted-foreground">2ος πελάτης / μήνα</p>
              <p className="text-3xl font-bold mt-1">200&euro;</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-primary/5">
              <p className="text-sm text-muted-foreground">3ος+ πελάτης / μήνα</p>
              <p className="text-3xl font-bold mt-1">250&euro;</p>
              <p className="text-xs text-muted-foreground">ανά πελάτη</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Η προμήθεια καταβάλλεται όταν έχει υπογραφεί συμφωνία και έχει πληρωθεί η προκαταβολή.
          </p>
        </CardContent>
      </Card>

      {/* Bonuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-600" />
              Bonus Επίδοσης
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-bold text-green-600 mb-2">+250&euro;</p>
            <p>
              Αν ο πωλητής φέρει <strong>5+ νέους πελάτες</strong> σε μηνιαία πακέτα μέσα στον ίδιο
              μήνα.
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              Bonus Ποιότητας
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-2xl font-bold text-blue-600 mb-2">+100&euro;</p>
            <p>
              Αν ένας νέος πελάτης παραμείνει ενεργός για <strong>3 συνεχόμενους μήνες</strong> (ανά
              πελάτη, μία φορά).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Στόχοι</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Discovery Ραντεβού / μήνα</p>
              <p className="text-2xl font-bold">4&ndash;6</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Νέοι Μηνιαίοι Πελάτες / μήνα</p>
              <p className="text-2xl font-bold">1&ndash;3</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discounts Policy */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Πολιτική Εκπτώσεων
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-start gap-2">
            <span className="text-destructive mt-0.5 shrink-0">&#10005;</span>
            Δεν δίνουμε εκπτώσεις στις τιμές πακέτων
          </p>
          <p className="flex items-start gap-2">
            <span className="text-destructive mt-0.5 shrink-0">&#10005;</span>Ο πωλητής δεν αλλάζει
            τιμές χωρίς έγκριση
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
            Αντί για έκπτωση, μπορεί (με έγκριση Άγγελου) να προσφέρει μικρό δώρο υπηρεσίας (π.χ.
            thumbnails τον 1ο μήνα)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================
   TAB: Checklist
   ============================ */
function ChecklistTab() {
  const sections = [
    {
      title: 'Πριν το Ραντεβού',
      items: [
        'Έχω δει website & social του πελάτη',
        'Ξέρω σε ποιο πακέτο στοχεύω (π.χ. 8 ή 12 video)',
        'Έχω στο μυαλό μου σχετικό case study (π.χ. Almeco, Technomat)',
      ],
    },
    {
      title: 'Κατά το Discovery Meeting',
      items: [
        'Ρώτησα για στόχο (κρατήσεις, brand, πωλήσεις κ.λπ.)',
        'Ρώτησα τι κάνουν σήμερα σε social / εικόνα',
        'Ρώτησα ανταγωνιστές & brands που θαυμάζουν',
        'Ρώτησα για το όραμα της εικόνας σε 1–2 χρόνια',
        'Ζήτησα references περιεχομένου που τους αρέσει',
        'Ρώτησα πλατφόρμες στόχευσης',
        'Ρώτησα συχνότητα & διαθεσιμότητα για γυρίσματα',
        'Πήρα εικόνα για budget range',
        'Έκανα σύνοψη («Άρα, αν κατάλαβα καλά…»)',
        'Πρότεινα προφορικά 1–2 πακέτα (8 ή 12 video)',
      ],
    },
    {
      title: 'Μετά το Ραντεβού – Πρόταση',
      items: [
        'Έστειλα email με περίληψη αναγκών',
        'Παρουσίασα 2–3 πακέτα (με τιμές & €/video)',
        'Έβαλα σύντομο ποιοι είμαστε & με ποιους δουλεύουμε',
        'Έγραψα ξεκάθαρα τα επόμενα βήματα (συμφωνία, προκαταβολή, ημερομηνίες)',
        'Έκλεισα με φιλικό τόνο («ανυπομονώ να ξεκινήσουμε…»)',
      ],
    },
    {
      title: 'Follow-up',
      items: [
        'Έκανα follow-up μέσα σε 1–3 ημέρες',
        "Πρότεινα mini call 10' αν χρειάζεται",
        'Αν ο πελάτης είπε «να το σκεφτώ», κλείσαμε συγκεκριμένη μέρα & ώρα',
      ],
    },
    {
      title: 'Όταν Συμφωνήσουμε',
      items: [
        'Επιβεβαίωσα γραπτώς πακέτο, τιμή, όρους',
        'Ζήτησα στοιχεία για τιμολόγιο',
        'Εξήγησα 50% προκαταβολή – 50% παράδοση',
        'Εξήγησα ότι με την προκαταβολή κλειδώνουν οι ημερομηνίες',
        'Εξήγησα όρο ακύρωσης (<7 ημέρες → 150€)',
        'Συμφωνήσαμε ημέρες γυρισμάτων (έστω προσωρινά)',
      ],
    },
    {
      title: 'Πριν το Γύρισμα',
      items: [
        'Έχει πληρωθεί η προκαταβολή',
        'Ο πελάτης έχει λάβει / συμπληρώσει brief',
        'Έχουμε logo & τυχόν brand guidelines',
        'Ο πελάτης γνωρίζει τον χρόνο παράδοσης',
        'Ο πελάτης γνωρίζει την πολιτική revisions (1 κύκλος / 2 αλλαγές)',
      ],
    },
  ];

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        icon={ListChecks}
        title="Checklist Πωλητή"
        description="Τσεκάρισε κάθε βήμα στη διαδικασία πώλησης"
      />

      {sections.map((section, si) => (
        <Card key={si}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                const isChecked = checked[key] || false;
                return (
                  <li key={key}>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span
                        className={`text-sm transition-colors ${isChecked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                      >
                        {item}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ============================
   MAIN: Sales Handbook
   ============================ */
export function SalesHandbook() {
  return (
    <div className="space-y-6">
      <PageHeader title="Εγχειρίδιο Πωλήσεων" description="Sales Manual & Tools — Devre Media v1" />

      <Tabs defaultValue="pitch" className="w-full">
        <div className="overflow-x-auto pb-2 rounded-xl border bg-card p-1.5">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-transparent">
            <TabsTrigger
              value="pitch"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <Megaphone className="h-4 w-4 hidden sm:inline" />
              Ταυτότητα
            </TabsTrigger>
            <TabsTrigger
              value="packages"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <Package className="h-4 w-4 hidden sm:inline" />
              Πακέτα
            </TabsTrigger>
            <TabsTrigger
              value="process"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <ListChecks className="h-4 w-4 hidden sm:inline" />
              Διαδικασία
            </TabsTrigger>
            <TabsTrigger
              value="objections"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <MessageSquareWarning className="h-4 w-4 hidden sm:inline" />
              Αντιρρήσεις
            </TabsTrigger>
            <TabsTrigger
              value="policies"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <FileText className="h-4 w-4 hidden sm:inline" />
              Πολιτικές
            </TabsTrigger>
            <TabsTrigger
              value="cases"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <Trophy className="h-4 w-4 hidden sm:inline" />
              Cases
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <Mail className="h-4 w-4 hidden sm:inline" />
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="checklist"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <CheckCircle2 className="h-4 w-4 hidden sm:inline" />
              Checklist
            </TabsTrigger>
            <TabsTrigger
              value="commission"
              className="gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
            >
              <Euro className="h-4 w-4 hidden sm:inline" />
              Αμοιβή
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pitch" className="mt-6">
          <PitchTab />
        </TabsContent>
        <TabsContent value="packages" className="mt-6">
          <PackagesTab />
        </TabsContent>
        <TabsContent value="process" className="mt-6">
          <ProcessTab />
        </TabsContent>
        <TabsContent value="objections" className="mt-6">
          <ObjectionsTab />
        </TabsContent>
        <TabsContent value="policies" className="mt-6">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="cases" className="mt-6">
          <CaseStudiesTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="checklist" className="mt-6">
          <ChecklistTab />
        </TabsContent>
        <TabsContent value="commission" className="mt-6">
          <CommissionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
