import { Anchor, Text } from "@mantine/core";

export default function AboutAltWiki() {
  return (
    <Text size="xs" c="dimmed" mt="xl">
      AltWiki — built on{" "}
      <Anchor
        href="https://github.com/docmost/docmost"
        target="_blank"
        rel="noreferrer"
        c="dimmed"
        underline="always"
        inherit
      >
        Docmost
      </Anchor>{" "}
      (AGPL-3.0) ·{" "}
      <Anchor
        href="https://github.com/StarAtNyte/AltWiki"
        target="_blank"
        rel="noreferrer"
        c="dimmed"
        underline="always"
        inherit
      >
        Source code
      </Anchor>
    </Text>
  );
}
