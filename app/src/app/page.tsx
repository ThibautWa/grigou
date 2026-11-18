import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingClient from '@/components/landing/LandingClient';

export default async function LandingPage() {
    const session = await auth();

    // Already signed in: go straight to the dashboard
    if (session?.user) {
        redirect('/dashboard');
    }

    return <LandingClient />;
}
