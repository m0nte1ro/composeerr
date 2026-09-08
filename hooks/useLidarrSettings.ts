"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getLidarrOptions,
  getLidarrSettings,
  saveLidarrSettings,
  testLidarrConnection,
} from "@/lib/client/lidarr-settings";
import type { LidarrOptions } from "@/lib/lidarr/types";

type ConnectionState =
  | {
      status: "idle";
    }
  | {
      status: "testing";
    }
  | {
      status: "success";
      version?: string | null;
      instanceName?: string | null;
    }
  | {
      status: "error";
      message: string;
    };

type SaveState = "idle" | "saving" | "saved" | "error";

function getFirstValidOption(current: string, options: Array<{ id: number }>) {
  if (current && options.some((item) => item.id.toString() === current)) {
    return current;
  }

  return options[0]?.id.toString() ?? "";
}

export function useLidarrSettings(setup = false) {
  const revision = useRef(0);
  const [testedRevision, setTestedRevision] = useState(-1);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasSavedApiKey, setHasSavedApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState(false);

  const [rootFolderId, setRootFolderId] = useState("");
  const [qualityProfileId, setQualityProfileId] = useState("");
  const [metadataProfileId, setMetadataProfileId] = useState("");

  const [searchAfterAdd, setSearchAfterAdd] = useState(true);

  const [options, setOptions] = useState<LidarrOptions | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "idle",
  });

  const [saveState, setSaveState] = useState<SaveState>("idle");

  const setDefaultSelections = useCallback((nextOptions: LidarrOptions) => {
    setRootFolderId((current) =>
      getFirstValidOption(current, nextOptions.rootFolders),
    );
    setQualityProfileId((current) =>
      getFirstValidOption(current, nextOptions.qualityProfiles),
    );
    setMetadataProfileId((current) =>
      getFirstValidOption(current, nextOptions.metadataProfiles),
    );
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const settings = await getLidarrSettings();

        if (!settings) {
          return;
        }

        setUrl(settings.url ?? "");
        setHasSavedApiKey(Boolean(settings.hasApiKey));

        setRootFolderId(settings.rootFolderId?.toString() ?? "");
        setQualityProfileId(settings.qualityProfileId?.toString() ?? "");
        setMetadataProfileId(settings.metadataProfileId?.toString() ?? "");

        setSearchAfterAdd(settings.searchAfterAdd ?? true);

        if (setup) return;
        try {
          const lidarrOptions = await getLidarrOptions();
          setOptions(lidarrOptions);
          setConnectionState({ status: "success" });
        } catch {
          setConnectionState({ status: "idle" });
        }
      } catch {
        setConnectionState({ status: "error", message: "Could not load Lidarr settings." });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [setup]);

  const connectionChanged = useCallback(() => {
    revision.current += 1;
    setTestedRevision(-1);
    setConnectionState({ status: "idle" });
    setSaveState("idle");
  }, []);

  const markAsEdited = useCallback(() => {
    revision.current += 1;
    setTestedRevision(-1);
    setSaveState("idle");
  }, []);

  const testConnection = useCallback(async () => {
    const currentRevision = revision.current;
    setTestedRevision(-1);
    setConnectionState({ status: "testing" });
    setSaveState("idle");

    try {
      const result = await testLidarrConnection({
        url,
        apiKey: apiKey.trim() || undefined,
      });

      if (currentRevision !== revision.current) { setConnectionState({ status: "idle" }); return; }
      setTestedRevision(currentRevision);
      setOptions(result.options);
      setDefaultSelections(result.options);

      setConnectionState({
        status: "success",
        version: result.lidarr?.version,
        instanceName: result.lidarr?.instanceName,
      });
    } catch (error) {
      if (currentRevision !== revision.current) { setConnectionState({ status: "idle" }); return; }
      setConnectionState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Connection test failed.",
      });
    }
  }, [apiKey, setDefaultSelections, url]);

  const saveSettings = useCallback(async () => {
    setSaveState("saving");

    try {
      const nextSettings = await saveLidarrSettings({
        url,
        apiKey: apiKey.trim() || undefined,
        rootFolderId: rootFolderId ? Number(rootFolderId) : null,
        qualityProfileId: qualityProfileId ? Number(qualityProfileId) : null,
        metadataProfileId: metadataProfileId ? Number(metadataProfileId) : null,
        searchAfterAdd,
      });

      setHasSavedApiKey(Boolean(nextSettings?.hasApiKey));
      setApiKey("");

      setEditingApiKey(false);
      setShowApiKey(false);

      setSaveState("saved");

      window.setTimeout(() => {
        setSaveState("idle");
      }, 1800);
      return true;
    } catch (error) {
      setSaveState("error");

      setConnectionState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Could not save settings.",
      });
    }
  }, [
    apiKey,
    metadataProfileId,
    qualityProfileId,
    rootFolderId,
    searchAfterAdd,
    url,
  ]);

  const canTest = useMemo(
    () => Boolean(url.trim()) && (Boolean(apiKey.trim()) || hasSavedApiKey),
    [apiKey, hasSavedApiKey, url],
  );

  const canSave = useMemo(
    () =>
      connectionState.status === "success" &&
      Boolean(rootFolderId) &&
      Boolean(qualityProfileId) &&
      Boolean(metadataProfileId) &&
      saveState !== "saving",
    [
      connectionState.status,
      metadataProfileId,
      qualityProfileId,
      rootFolderId,
      saveState,
    ],
  );

  return {
    loading,
    tested: testedRevision >= 0,
    options,
    connectionState,
    saveState,
    canTest,
    canSave,
    url,
    setUrl,
    apiKey,
    setApiKey,
    hasSavedApiKey,
    showApiKey,
    setShowApiKey,
    editingApiKey,
    setEditingApiKey,
    rootFolderId,
    setRootFolderId,
    qualityProfileId,
    setQualityProfileId,
    metadataProfileId,
    setMetadataProfileId,
    searchAfterAdd,
    setSearchAfterAdd,
    connectionChanged,
    markAsEdited,
    testConnection,
    saveSettings,
  };
}
