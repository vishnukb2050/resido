import React from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * Returns a stable cache-bust key for workspace/user avatars. It only changes
 * when the underlying photo URLs change — NOT on every screen focus.
 *
 * Previously this hook re-fetched profile + workspaces and set
 * `imageTimestamp = Date.now()` on every focus, which re-downloaded every
 * avatar from R2 and made navigation feel slow. Profile edits already update
 * Zustand from EditProfile; pull-to-refresh can call authApi directly.
 */
export function useProfileRefresh(): number {
    const profilePhoto = useAuthStore((s) => s.user?.profilePhoto);
    const activePhoto = useAuthStore((s) => s.activeWorkspace?.photoUrl);
    const workspacePhotos = useAuthStore((s) =>
        (s.workspaces || []).map((w) => w.photoUrl || '').join('|'),
    );

    return React.useMemo(() => {
        const sig = `${profilePhoto || ''}|${activePhoto || ''}|${workspacePhotos}`;
        let h = 0;
        for (let i = 0; i < sig.length; i++) {
            h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
        }
        return Math.abs(h);
    }, [profilePhoto, activePhoto, workspacePhotos]);
}
