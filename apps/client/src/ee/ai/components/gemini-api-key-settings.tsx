import {
  Group,
  Text,
  TextInput,
  Button,
  Stack,
  Paper,
} from "@mantine/core";
import { useAtom } from "jotai";
import { workspaceAtom } from "@/features/user/atoms/current-user-atom.ts";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { updateWorkspace } from "@/features/workspace/services/workspace-service.ts";
import { notifications } from "@mantine/notifications";
import { IconKey } from "@tabler/icons-react";

export default function GeminiApiKeySettings() {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useAtom(workspaceAtom);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // The server returns a masked value when a key is configured
  const existingKey = workspace?.settings?.integrations?.geminiApiKey;
  const hasExistingKey = Boolean(existingKey && existingKey !== "");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updatedWorkspace = await updateWorkspace({ geminiApiKey: apiKey });
      setWorkspace(updatedWorkspace);
      notifications.show({
        message: t("Gemini API key saved successfully"),
        color: "green",
      });
    } catch (err) {
      notifications.show({
        message: err?.response?.data?.message || t("Failed to save API key"),
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    try {
      const updatedWorkspace = await updateWorkspace({ geminiApiKey: "" });
      setWorkspace(updatedWorkspace);
      setApiKey("");
      notifications.show({
        message: t("Gemini API key removed"),
        color: "green",
      });
    } catch (err) {
      notifications.show({
        message: err?.response?.data?.message || t("Failed to remove API key"),
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" mt="xl">
      <Stack gap="md">
        <Group gap="xs">
          <IconKey size={20} />
          <Text fw={500}>{t("Gemini API Key")}</Text>
        </Group>

        <Text size="sm" c="dimmed">
          {t(
            "Configure your Gemini API key to enable AI-powered documentation generation from GitHub repositories.",
          )}
        </Text>

        <TextInput
          label={t("API Key")}
          placeholder={hasExistingKey ? "••••••••••••••••" : "Enter your Gemini API key"}
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          type="password"
        />

        <Text size="xs" c="dimmed">
          {t("Get your API key from")}{" "}
          <Text
            component="a"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            c="blue"
          >
            Google AI Studio
          </Text>
        </Text>

        <Group justify="flex-end" gap="sm">
          {hasExistingKey && (
            <Button
              variant="subtle"
              color="red"
              onClick={handleClear}
              loading={isLoading}
            >
              {t("Remove")}
            </Button>
          )}
          <Button onClick={handleSave} loading={isLoading} disabled={!apiKey}>
            {t("Save")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
