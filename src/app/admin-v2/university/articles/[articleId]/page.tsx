import Page from '@/app/admin/university/articles/[articleId]/page';

/** Ίδια σελίδα, μέσα στο νέο κέλυφος. */
export default function AdminV2UniversityArticlesArticleIdPage(props: Parameters<typeof Page>[0]) {
  return <Page {...props} />;
}
