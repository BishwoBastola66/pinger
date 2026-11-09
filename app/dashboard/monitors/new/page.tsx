import { redirect } from 'next/navigation';

export default function NewMonitorPage() {
  redirect('/dashboard/monitors?new=true');
}
