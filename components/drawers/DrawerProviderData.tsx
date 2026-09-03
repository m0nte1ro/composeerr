"use client";

import {
    createContext,
    useContext,
    useEffect,
    useEffectEvent,
    useState,
    type ReactNode,
} from "react";

type ResourceEntry =
    | { status: "loading"; promise: Promise<unknown> }
    | { status: "ready"; value: unknown };

const DrawerProviderDataContext = createContext<Map<string, ResourceEntry> | null>(
    null,
);

export function DrawerProviderData({ children }: { children: ReactNode }) {
    const [cache] = useState(() => new Map<string, ResourceEntry>());

    return (
        <DrawerProviderDataContext.Provider value={cache}>
            {children}
        </DrawerProviderDataContext.Provider>
    );
}

export function useProviderResource<T>(key: string, loader: () => Promise<T>) {
    const drawerCache = useContext(DrawerProviderDataContext);
    const [localCache] = useState(() => new Map<string, ResourceEntry>());
    const cache = drawerCache ?? localCache;
    const loadResource = useEffectEvent(loader);
    const [state, setState] = useState<{
        key: string;
        loading: boolean;
        value: T | null;
    }>({ key, loading: true, value: null });

    useEffect(() => {
        let active = true;
        const existing = cache.get(key);

        const promise = existing?.status === "ready"
            ? Promise.resolve(existing.value as T)
            : existing?.status === "loading"
                ? (existing.promise as Promise<T>)
                : loadResource().then((value) => {
                    cache.set(key, { status: "ready", value });
                    return value;
                });

        if (!existing) {
            cache.set(key, { status: "loading", promise });
        }

        promise
            .then((value) => {
                if (active) setState({ key, loading: false, value });
            })
            .catch(() => {
                cache.delete(key);
                if (active) setState({ key, loading: false, value: null });
            });

        return () => {
            active = false;
        };
    }, [cache, key]);

    const cached = cache.get(key);
    if (cached?.status === "ready") {
        return { loading: false, value: cached.value as T };
    }
    return state.key === key
        ? { loading: state.loading, value: state.value }
        : { loading: true, value: null };
}