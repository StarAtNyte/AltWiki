import {
  Modal,
  TextInput,
  Button,
  Stack,
  Progress,
  Text,
  Group,
  Paper,
  ThemeIcon,
  Box,
  Select,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconCheck,
  IconLoader,
  IconCircle,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import * as z from "zod";
import { useGenerateDocs } from "../hooks/use-generate-docs";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { buildPageUrl } from "@/features/page/page.utils";

const formSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .regex(
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/,
      "Must be a valid GitHub repository URL"
    ),
  spaceId: z.string().min(1, "Please select a space"),
});

type FormValues = z.infer<typeof formSchema>;

interface GithubDocsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function GithubDocsModal({ opened, onClose }: GithubDocsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { generate, isLoading, progress, reset } = useGenerateDocs();
  const { data: spacesData } = useGetSpacesQuery();

  const form = useForm<FormValues>({
    validate: zodResolver(formSchema),
    initialValues: {
      url: "",
      spaceId: "",
    },
  });

  const handleSubmit = (values: FormValues) => {
    generate({
      url: values.url,
      spaceId: values.spaceId,
    });
  };

  const handleClose = () => {
    reset();
    form.reset();
    onClose();
  };

  const { spaceSlug } = useParams();

  const handleViewDocs = () => {
    const page = progress?.pages?.[0];
    if (page) {
      handleClose();
      navigate(buildPageUrl(spaceSlug, page.slugId, page.title));
    }
  };

  const spaceOptions =
    spacesData?.items?.map((space) => ({
      value: space.id,
      label: space.name,
    })) || [];

  const getStatusIcon = (
    stepStatus: "pending" | "active" | "complete" | "error"
  ) => {
    switch (stepStatus) {
      case "complete":
        return <IconCheck size={14} />;
      case "active":
        return <IconLoader size={14} className="animate-spin" />;
      case "error":
        return <IconAlertCircle size={14} />;
      default:
        return <IconCircle size={14} />;
    }
  };

  const getStepStatus = (
    step: string
  ): "pending" | "active" | "complete" | "error" => {
    if (!progress) return "pending";
    if (progress.status === "error") return "error";

    const steps = ["fetching", "analyzing", "generating", "creating", "complete"];
    const currentIndex = steps.indexOf(progress.status);
    const stepIndex = steps.indexOf(step);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconBrandGithub size={20} />
          <Text fw={600}>{t("Generate Docs from GitHub")}</Text>
        </Group>
      }
      size="md"
      centered
    >
      {!progress ? (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label={t("GitHub Repository URL")}
              placeholder="https://github.com/owner/repo"
              leftSection={<IconBrandGithub size={16} />}
              {...form.getInputProps("url")}
            />

            <Select
              label={t("Target Space")}
              placeholder={t("Select a space")}
              data={spaceOptions}
              searchable
              {...form.getInputProps("spaceId")}
            />

            <Text size="xs" c="dimmed">
              {t(
                "Documentation will be generated using AI and saved to the selected space."
              )}
            </Text>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                {t("Cancel")}
              </Button>
              <Button type="submit" loading={isLoading}>
                {t("Generate Docs")}
              </Button>
            </Group>
          </Stack>
        </form>
      ) : (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text fw={500} size="sm">
                {progress.message}
              </Text>
              <Progress
                value={progress.progress}
                size="lg"
                radius="xl"
                animated={progress.status !== "complete" && progress.status !== "error"}
                color={progress.status === "error" ? "red" : "blue"}
              />
            </Stack>
          </Paper>

          <Stack gap="xs">
            {[
              { key: "fetching", label: t("Fetching repository...") },
              { key: "analyzing", label: t("Analyzing structure...") },
              { key: "generating", label: t("Generating documentation...") },
              { key: "creating", label: t("Creating pages...") },
            ].map((step) => (
              <Group key={step.key} gap="xs">
                <ThemeIcon
                  size="sm"
                  variant="light"
                  color={
                    getStepStatus(step.key) === "complete"
                      ? "green"
                      : getStepStatus(step.key) === "active"
                        ? "blue"
                        : getStepStatus(step.key) === "error"
                          ? "red"
                          : "gray"
                  }
                >
                  {getStatusIcon(getStepStatus(step.key))}
                </ThemeIcon>
                <Text
                  size="sm"
                  c={getStepStatus(step.key) === "pending" ? "dimmed" : undefined}
                >
                  {step.label}
                </Text>
              </Group>
            ))}
          </Stack>

          {progress.status === "complete" && (
            <Group justify="flex-end" mt="md">
              <Button onClick={handleViewDocs}>{t("View Documentation")}</Button>
            </Group>
          )}

          {progress.status === "error" && (
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleClose}>
                {t("Close")}
              </Button>
              <Button
                onClick={() => {
                  reset();
                }}
              >
                {t("Try Again")}
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
