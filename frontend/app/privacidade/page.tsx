import { redirect } from 'next/navigation';
import { PRIVACY_URL } from '@/lib/legal';

export default function PrivacidadePage() {
  redirect(PRIVACY_URL);
}
