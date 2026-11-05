import { PasswordResetForm } from "@/features/auth/components/password-reset-form";
import { Link, useSearchParams } from "react-router-dom";
import { useVerifyUserTokenQuery } from "@/features/auth/queries/auth-query";
import { Box, Button, Container, Group, Text } from "@mantine/core";
import classes from "@/features/auth/components/auth.module.css";
import { AuthBrand } from "@/features/auth/components/auth-layout.tsx";
import APP_ROUTE from "@/lib/app-route";
import { useTranslation } from "react-i18next";
import { DocumentTitle } from "@/components/ui/document-title.tsx";

export default function PasswordReset() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError } = useVerifyUserTokenQuery({
    token: searchParams.get("token"),
    type: "forgot-password",
  });
  const resetToken = searchParams.get("token");

  if (isLoading) {
    return <div></div>;
  }

  if (isError || !resetToken) {
    return (
      <>
        <DocumentTitle title={t("Password Reset")} />
        <Container size={420} className={classes.container}>
          <Box className={classes.containerBox}>
          <AuthBrand />
          <Text size="lg" ta="center">
            {t("Invalid or expired password reset link")}
          </Text>
          <Group justify="center">
            <Button
              component={Link}
              to={APP_ROUTE.AUTH.LOGIN}
              variant="subtle"
              size="md"
            >
              {t("Goto login page")}
            </Button>
          </Group>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <DocumentTitle title={t("Password Reset")} />
      <PasswordResetForm resetToken={resetToken} />
    </>
  );
}
