import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingClient from '@/components/landing/LandingClient';
import './landing.css';

export default async function LandingPage() {
    const session = await auth();

    // Si déjà connecté, rediriger vers le dashboard
    if (session?.user) {
        redirect('/dashboard');
    }

    return (
        <div className="landing">
            <LandingClient />
        </div>
    );
}