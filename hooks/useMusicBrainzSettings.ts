"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMusicBrainzSettings,
  resetMusicBrainzSettings,
  saveMusicBrainzSettings,
  testMusicBrainzConnection,
} from "@/lib/client/musicbrainz-settings";
import type {
  MusicBrainzAuthMode,
  MusicBrainzSettingsPayload,
  PublicMusicBrainzSettings,
} from "@/lib/content/musicbrainz-settings";

export type MusicBrainzConnectionState =
  | { status: "idle" }
  | { status: "testing" }
  | { status: "success"; title: string; message: string }
  | { status: "error"; message: string };

type SaveState = "idle" | "saving" | "saved" | "error";

export function useMusicBrainzSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customized, setCustomized] = useState(false);
  const [url, setUrl] = useState("");
  const [authMode, setAuthMode] = useState<MusicBrainzAuthMode>("none");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [headerName, setHeaderName] = useState("");
  const [headerSecret, setHeaderSecret] = useState("");
  const [hasSavedHeaderSecret, setHasSavedHeaderSecret] = useState(false);
  const [editingHeaderSecret, setEditingHeaderSecret] = useState(false);
  const [showHeaderSecret, setShowHeaderSecret] = useState(false);
  const [connectionState, setConnectionState] =
    useState<MusicBrainzConnectionState>({ status: "idle" });
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const applyPublicSettings = useCallback((settings: PublicMusicBrainzSettings) => {
    setCustomized(settings.customized);
    setUrl(settings.url);
    setAuthMode(settings.authMode);
    setUsername(settings.username);
    setHeaderName(settings.headerName);
    setHasSavedPassword(settings.hasPassword);
    setHasSavedHeaderSecret(settings.hasHeaderSecret);
    setPassword("");
    setHeaderSecret("");
    setEditingPassword(false);
    setEditingHeaderSecret(false);
    setShowPassword(false);
    setShowHeaderSecret(false);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        applyPublicSettings(await getMusicBrainzSettings());
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load MusicBrainz settings.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [applyPublicSettings]);

  const markAsEdited = useCallback(() => {
    setConnectionState({ status: "idle" });
    setSaveState("idle");
  }, []);

  const getPayload = useCallback(
    (): MusicBrainzSettingsPayload => ({
      url,
      authMode,
      username: authMode === "basic" ? username : undefined,
      password:
        authMode === "basic" && password.length > 0 ? password : undefined,
      headerName: authMode === "header" ? headerName : undefined,
      headerSecret:
        authMode === "header" && headerSecret.length > 0
          ? headerSecret
          : undefined,
    }),
    [authMode, headerName, headerSecret, password, url, username],
  );

  const testConnection = useCallback(async () => {
    setConnectionState({ status: "testing" });
    setSaveState("idle");

    try {
      await testMusicBrainzConnection(getPayload());
      setConnectionState({
        status: "success",
        title: "MusicBrainz is reachable.",
        message: "The configured Web Service endpoint responded successfully.",
      });
    } catch (error) {
      setConnectionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "MusicBrainz connection test failed.",
      });
    }
  }, [getPayload]);

  const testConnectionValues = useCallback(
    async (payload: MusicBrainzSettingsPayload) => {
      setConnectionState({ status: "testing" });
      setSaveState("idle");

      try {
        await testMusicBrainzConnection(payload);
        setConnectionState({
          status: "success",
          title: "MusicBrainz is reachable.",
          message: "The configured Web Service endpoint responded successfully.",
        });
      } catch (error) {
        setConnectionState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "MusicBrainz connection test failed.",
        });
        throw error;
      }
    },
    [],
  );

  const saveSettings = useCallback(async () => {
    setSaveState("saving");

    try {
      const settings = await saveMusicBrainzSettings(getPayload());
      applyPublicSettings(settings);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      setSaveState("error");
      setConnectionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not save MusicBrainz settings.",
      });
    }
  }, [applyPublicSettings, getPayload]);

  const saveConnectionValues = useCallback(
    async (payload: MusicBrainzSettingsPayload) => {
      setSaveState("saving");

      try {
        applyPublicSettings(await saveMusicBrainzSettings(payload));
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1800);
      } catch (error) {
        setSaveState("error");
        setConnectionState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not save MusicBrainz settings.",
        });
        throw error;
      }
    },
    [applyPublicSettings],
  );

  const resetSettings = useCallback(async () => {
    setSaveState("saving");

    try {
      applyPublicSettings(await resetMusicBrainzSettings());
      setConnectionState({ status: "idle" });
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      setSaveState("error");
      setConnectionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not reset MusicBrainz settings.",
      });
    }
  }, [applyPublicSettings]);

  const hasRequiredSecret =
    authMode === "basic"
      ? Boolean(password) || hasSavedPassword
      : authMode === "header"
        ? Boolean(headerSecret) || hasSavedHeaderSecret
        : true;

  const fieldsAreValid = useMemo(
    () =>
      Boolean(url.trim()) &&
      hasRequiredSecret &&
      (authMode !== "basic" || Boolean(username.trim())) &&
      (authMode !== "header" || Boolean(headerName.trim())),
    [authMode, hasRequiredSecret, headerName, url, username],
  );

  return {
    loading,
    loadError,
    customized,
    url,
    setUrl,
    authMode,
    setAuthMode,
    username,
    setUsername,
    password,
    setPassword,
    hasSavedPassword,
    editingPassword,
    setEditingPassword,
    showPassword,
    setShowPassword,
    headerName,
    setHeaderName,
    headerSecret,
    setHeaderSecret,
    hasSavedHeaderSecret,
    editingHeaderSecret,
    setEditingHeaderSecret,
    showHeaderSecret,
    setShowHeaderSecret,
    connectionState,
    saveState,
    canTest: fieldsAreValid && connectionState.status !== "testing",
    canSave: fieldsAreValid && saveState !== "saving",
    markAsEdited,
    testConnection,
    testConnectionValues,
    saveSettings,
    saveConnectionValues,
    resetSettings,
  };
}
