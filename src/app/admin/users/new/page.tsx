import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { AdminMain } from '@/components/admin/bits';
import { AdminSection, CreateUserForm } from '@/components/admin/user-forms';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'ახალი ანგარიში' };

export default async function NewUserPage() {
  const actor = await requireAdmin('/admin/users/new');

  return (
    <AdminMain narrow>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        მომხმარებლები
      </Link>
      <PageHeader title="ახალი ანგარიში" />
      <AdminSection
        title="ანგარიშის მონაცემები"
        description="Dawere ელფოსტას არ აგზავნის: პაროლი შენ უნდა გადასცე ახალ წევრს."
      >
        <CreateUserForm canAppointAdmins={actor.access === 'super_admin'} />
      </AdminSection>
    </AdminMain>
  );
}
