import React from "react";
import { Result, Button, Typography, Space } from "antd";
import { Colors } from "../config/color";
import { useAuth } from "@clerk/clerk-react";

const RestrictedAccess = ({ showButton = true }) => {
  const { signOut } = useAuth();
  const colors = Colors();
  const { Text } = Typography;
  const handleSignOutAndRedirect = () => {
    signOut();
  };

  return (
    <Space
      className="flex flex-col items-center justify-center w-full h-screen text-center overflow-hidden"
      style={{
        backgroundColor: colors.theme,
        color: colors.textcolor,
      }}
    >
      <Result
        status="403"
        title={
          <Text style={{ color: colors.textcolor }}>Access Restricted</Text>
        }
        subTitle={
          <>
            <Text style={{ color: colors.textcolor }}>
              You are not part of an organization or have not received an
              invitation. Please contact the administrator to get access.
            </Text>
          </>
        }
        extra={
          showButton && (
            <Button
              type="primary"
              onClick={handleSignOutAndRedirect}
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.primary,
              }}
            >
              Return to Sign In
            </Button>
          )
        }
      />
    </Space>
  );
};

export default RestrictedAccess;
