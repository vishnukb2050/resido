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
        queryKey: ['conversations', activeWorkspace?.tenantId, activeWorkspace?.dbName, token],
        queryFn: async () => {
            const { data } = await chatApi.getConversations();
            return data || [];
        },
        enabled: !!activeWorkspace && !!token,
        staleTime: 1000 * 60 * 2,
    });
}
