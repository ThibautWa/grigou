// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            name: string;
        } & DefaultSession['user'];
    }

    interface User {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        name: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        name: string;
    }
}