'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Οι σύνδεσμοι μέσα στις υπάρχουσες σελίδες δείχνουν στο παλιό prefix
 * (`/client/...`), γιατί οι σελίδες μετακόμισαν αυτούσιες. Χωρίς αυτό, το πρώτο
 * κλικ σε ένα έργο ή συμφωνητικό σε πετάει έξω από το νέο κέλυφος.
 *
 * Ανακατευθύνει την πλοήγηση στο δίδυμο `-v2`. Είναι εργαλείο προεπισκόπησης:
 * όταν το νέο μοντέλο γίνει το κανονικό, το παλιό prefix παύει να υπάρχει και
 * αυτό το αρχείο φεύγει.
 */
export function KeepInShell({ prefix }: { prefix: string }) {
  const router = useRouter();

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const openedInNewContext =
        event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
      if (event.defaultPrevented || openedInNewContext) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a');
      if (!anchor || (anchor.target && anchor.target !== '_self')) return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href?.startsWith(`/${prefix}/`)) return;

      event.preventDefault();
      router.push(`/${prefix}-v2${href.slice(prefix.length + 1)}`);
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [prefix, router]);

  return null;
}
