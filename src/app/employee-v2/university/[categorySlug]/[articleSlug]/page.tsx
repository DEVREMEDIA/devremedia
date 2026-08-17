import Page from '@/app/employee/university/[categorySlug]/[articleSlug]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function EmployeeV2UniversityCategorySlugArticleSlugPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
