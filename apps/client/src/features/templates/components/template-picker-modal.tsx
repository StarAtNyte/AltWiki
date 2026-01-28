import {
  Modal,
  SimpleGrid,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Tabs,
  ThemeIcon,
  UnstyledButton,
  Box,
} from "@mantine/core";
import {
  IconSparkles,
  IconPhoto,
  IconCube,
  IconBrain,
  IconCloud,
  IconFile,
  IconDeviceMobile,
  IconPalette,
  IconPlayerPlay,
  IconTemplate,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { templates, templateCategories, DocTemplate } from "../data/templates";

const iconMap: Record<string, React.ReactNode> = {
  sparkles: <IconSparkles size={24} />,
  photo: <IconPhoto size={24} />,
  cube: <IconCube size={24} />,
  brain: <IconBrain size={24} />,
  cloud: <IconCloud size={24} />,
  file: <IconFile size={24} />,
  "device-mobile": <IconDeviceMobile size={24} />,
  palette: <IconPalette size={24} />,
  "player-play": <IconPlayerPlay size={24} />,
};

const categoryIconMap: Record<string, React.ReactNode> = {
  palette: <IconPalette size={16} />,
  brain: <IconBrain size={16} />,
  tool: <IconTemplate size={16} />,
  "device-mobile": <IconDeviceMobile size={16} />,
};

interface TemplatePickerModalProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (template: DocTemplate) => void;
}

export function TemplatePickerModal({
  opened,
  onClose,
  onSelect,
}: TemplatePickerModalProps) {
  const { t } = useTranslation();

  const handleSelect = (template: DocTemplate) => {
    onSelect(template);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconTemplate size={20} />
          <Text fw={600}>{t("Choose a Template")}</Text>
        </Group>
      }
      size={900}
      centered
    >
      <Tabs defaultValue="all">
        <Tabs.List mb="md">
          <Tabs.Tab value="all">{t("All")}</Tabs.Tab>
          {templateCategories.map((cat) => (
            <Tabs.Tab
              key={cat.id}
              value={cat.id}
              leftSection={categoryIconMap[cat.icon]}
            >
              {t(cat.label)}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="all">
          <TemplateGrid templates={templates} onSelect={handleSelect} />
        </Tabs.Panel>

        {templateCategories.map((cat) => (
          <Tabs.Panel key={cat.id} value={cat.id}>
            <TemplateGrid
              templates={templates.filter((t) => t.category === cat.id)}
              onSelect={handleSelect}
            />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Modal>
  );
}

interface TemplateGridProps {
  templates: DocTemplate[];
  onSelect: (template: DocTemplate) => void;
}

function TemplateGrid({ templates, onSelect }: TemplateGridProps) {
  const { t } = useTranslation();

  if (templates.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t("No templates in this category")}
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelect={() => onSelect(template)}
        />
      ))}
    </SimpleGrid>
  );
}

interface TemplateCardProps {
  template: DocTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const { t } = useTranslation();
  const category = templateCategories.find((c) => c.id === template.category);

  return (
    <UnstyledButton onClick={onSelect} style={{ display: "block" }}>
      <Card
        withBorder
        padding="md"
        radius="md"
        style={{
          cursor: "pointer",
          transition: "transform 0.1s, box-shadow 0.1s",
        }}
        className="template-card"
      >
        <Group wrap="nowrap" gap="md">
          <ThemeIcon size={48} radius="md" variant="light" color="blue">
            {iconMap[template.icon] || <IconFile size={24} />}
          </ThemeIcon>
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Group justify="space-between" wrap="nowrap">
              <Text fw={600} truncate>
                {t(template.name)}
              </Text>
              <Badge size="xs" variant="light" color="gray">
                {category?.label}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {t(template.description)}
            </Text>
          </Stack>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
