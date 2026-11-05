import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  SelectProps,
  Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { useWorkspaceMembersQuery } from "@/features/workspace/queries/workspace-query.ts";
import { usePageQuery } from "@/features/page/queries/page-query.ts";
import { changePageOwner } from "@/features/page/services/page-service.ts";
import { IUser } from "@/features/user/types/user.types.ts";
import classes from "@/features/space/icons/space-icon-picker.module.css";

interface ChangeOwnerModalProps {
  pageId: string;
  opened: boolean;
  onClose: () => void;
}

type MemberOption = {
  value: string;
  label: string;
  avatarUrl?: string;
  email?: string;
};

const renderOption: SelectProps["renderOption"] = ({ option }) => {
  const o = option as unknown as MemberOption;
  return (
    <Group gap="sm" wrap="nowrap">
      <CustomAvatar avatarUrl={o.avatarUrl} name={o.label} size={28} />
      <div>
        <Text size="sm" lineClamp={1}>
          {o.label}
        </Text>
        <Text size="xs" opacity={0.5}>
          {o.email}
        </Text>
      </div>
    </Group>
  );
};

export default function ChangeOwnerModal({
  pageId,
  opened,
  onClose,
}: ChangeOwnerModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: page } = usePageQuery({ pageId: opened ? pageId : undefined });
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery] = useDebouncedValue(searchValue, 300);
  const [userId, setUserId] = useState<string | null>(null);
  const [includeSubpages, setIncludeSubpages] = useState(false);
  const [known, setKnown] = useState<Record<string, MemberOption>>({});

  const { data: users } = useWorkspaceMembersQuery({
    query: debouncedQuery,
    limit: 50,
  });

  useEffect(() => {
    if (!opened) {
      setUserId(null);
      setSearchValue("");
      setIncludeSubpages(false);
    }
  }, [opened]);

  // Keep previously seen members so the selected value keeps its label
  // after the search results change.
  useEffect(() => {
    if (!users?.items) return;
    setKnown((prev) => {
      const next = { ...prev };
      users.items.forEach((u: IUser) => {
        next[u.id] = {
          value: u.id,
          label: u.name,
          avatarUrl: u.avatarUrl,
          email: u.email,
        };
      });
      return next;
    });
  }, [users]);

  const data = useMemo(() => {
    const ids = new Set((users?.items ?? []).map((u: IUser) => u.id));
    if (userId) ids.add(userId);
    return [...ids]
      .map((id) => known[id])
      .filter((o) => o && o.value !== page?.creator?.id);
  }, [users, known, userId, page?.creator?.id]);

  const mutation = useMutation({
    mutationFn: () =>
      changePageOwner({ pageId: page.id, userId, includeSubpages }),
    onSuccess: async (res) => {
      notifications.show({ message: t("Page owner changed") });
      if (res.warning) {
        notifications.show({
          color: "yellow",
          autoClose: 8000,
          message: t("New owner is not a member of this space"),
        });
      }
      if (includeSubpages) {
        await queryClient.invalidateQueries({ queryKey: ["pages"] });
      } else {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["pages", res.pageId] }),
          queryClient.invalidateQueries({ queryKey: ["pages", res.slugId] }),
        ]);
      }
      onClose();
    },
    onError: (err: any) => {
      notifications.show({
        color: "red",
        message:
          err?.response?.data?.message ?? t("Failed to change page owner"),
      });
    },
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("Change owner")}
      size={480}
      radius={18}
      classNames={{
        content: classes.content,
        header: classes.header,
        overlay: classes.overlay,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Text size="xs" c="dimmed" mb={6}>
        {t("Current owner")}
      </Text>
      <Group gap="sm" wrap="nowrap" mb="md">
        <CustomAvatar
          avatarUrl={page?.creator?.avatarUrl}
          name={page?.creator?.name ?? "?"}
          size={28}
        />
        <Text size="sm" fw={500}>
          {page?.creator?.name ?? t("Unknown")}
        </Text>
      </Group>

      <Select
        label={t("New owner")}
        placeholder={t("Search for users")}
        data={data}
        value={userId}
        onChange={(v) => setUserId(v == null ? null : String(v))}
        renderOption={renderOption}
        searchable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filter={({ options }) => options}
        nothingFoundMessage={t("No user found")}
        maxDropdownHeight={280}
        variant="filled"
        comboboxProps={{ withinPortal: true }}
        data-autofocus
      />

      <Checkbox
        mt="md"
        label={t("Also change owner of subpages")}
        checked={includeSubpages}
        onChange={(e) => setIncludeSubpages(e.currentTarget.checked)}
      />

      <Group justify="flex-end" mt="lg" gap="xs">
        <Button variant="default" size="sm" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          size="sm"
          color="dark"
          disabled={!userId || !page}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {t("Save")}
        </Button>
      </Group>
    </Modal>
  );
}
