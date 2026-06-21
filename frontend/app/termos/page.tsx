import { redirect } from 'next/navigation';
import { TERMS_URL } from '@/lib/legal';

export default function TermosPage() {
  redirect(TERMS_URL);
}
