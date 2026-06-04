import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * Cached conversation list — re-entering the chat tab renders instantly from
 * cache while react-query revalidates in the background.
 */
export function useConversations() {
    const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
    const token = useAuthStore((s) => s.token);

    return useQuery({
        // Personal/contact chats exist even with no active community, so the
        // list must load whenever the user is authenticated. We still key on the
        // workspace so switching communities refreshes the (community) groups.
        queryKey: ['conversations', activeWorkspace?.tenantId, activeWorkspace?.dbName, token],
        queryFn: async () => {
            const { data } = await chatApi.getConversations();
            return data || [];
        },
        enabled: !!token,
        staleTime: 1000 * 60 * 2,
    });
}
