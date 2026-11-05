import { Helmet } from "react-helmet-async";
import { PasswordResetForm } from "@/features/auth/components/password-reset-form";
import { Link, useSearchParams } from "react-router-dom";
import { useVerifyUserTokenQuery } from "@/features/auth/queries/auth-query";
import { Box, Button, Container, Group, Text } from "@mantine/core";
import classes from "@/features/auth/components/auth.module.css";
import { AuthBrand } from "@/features/auth/components/auth-layout.tsx";
import APP_ROUTE from "@/lib/app-route";
import { getAppName } from "@/lib/config.ts";
import { useTranslation } from "react-i18next";

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
        <Helmet>
          <title>
            {t("Password Reset")} - {getAppName()}
          </title>
        </Helmet>
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
      <Helmet>
        <title>
          {t("Password Reset")} - {getAppName()}
        </title>
      </Helmet>
      <PasswordResetForm resetToken={resetToken} />
    </>
  );
}
