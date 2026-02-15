
import { headers } from 'next/headers';

export function checkAdminAuth() {
    const headersList = headers();
    const password = headersList.get('x-admin-password');
    const adminPassword = process.env.ADMIN_PASSWORD || 'vibes69';

    return password === adminPassword;
}
