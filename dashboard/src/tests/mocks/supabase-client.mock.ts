import { vi } from 'vitest';

export const createSupabaseMock = () => {
    const mock = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        match: vi.fn().mockReturnThis(),
        rpc: vi.fn().mockReturnThis(),
        auth: {
            getSession: vi.fn(),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
        channel: vi.fn().mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockReturnThis(),
        }),
    };

    return mock as any;
};
