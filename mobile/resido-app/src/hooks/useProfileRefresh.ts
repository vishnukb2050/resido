import React from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

/**
 * Hook used by every dashboard to keep the workspace-switcher avatars in sync
 * with the server when the screen regains focus. Returns a numeric timestamp
 * that consumers should pass as the `cacheBust` prop on `<WorkspaceBubble />`
 * so that the underlying `<Image>` actually re-fetches the new R2 URL instead
 * of showing the stale cached pixels.
 *
 * Why this exists: when a user updates their profile photo in EditProfile, we
 * already write the new URL into Zustand from that screen. But role-specific
 * dashboards (Admin / Member / Service / Security / Cleaning) don't otherwise
 * re-fetch on focus, so any race condition (slow R2, transient 4xx, or
 * `getProfile` returning before R2 has the new key in cold cache) would leave
 * the bubble showing an empty placeholder. This hook refetches and busts cache.
 */
export function useProfileRefresh(): number {
    const [imageTimestamp, setImageTimestamp] = React.useState(Date.now());

    useFocusEffect(
        React.useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    const [userRes, wsRes] = await Promise.all([
                        authApi.getProfile().catch(() => null),
                        authApi.getWorkspaces().catch(() => null),
                    ]);
                    if (cancelled) return;
                    if (userRes?.data) useAuthStore.getState().updateUser(userRes.data);
                    if (wsRes?.data) useAuthStore.getState().setWorkspaces(wsRes.data);
                    setImageTimestamp(Date.now());
                } catch {
                    // Best-effort — never crash the dashboard over a refresh.
                }
            })();
            return () => {
                cancelled = true;
            };
        }, []),
    );

    return imageTimestamp;
}
