import AccountDetailPage from '@/components/AccountDetailPage';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountDetailRoute({ params }: PageProps) {
  const { id } = await params;
  return <AccountDetailPage accountId={id} />;
}
