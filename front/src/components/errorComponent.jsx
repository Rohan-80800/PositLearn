import { Button, Result,Space, Typography } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { Colors } from "../config/color";

const ErrorComponent = ({ errorCode = "404", message = "Page not found", showButton = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const colors = Colors();
  const {Text}= Typography

  const supportedErrorCodes = ["403", "404", "500"];
  const errorData = location.state?.error || { errorCode, message };
  const displayCode = supportedErrorCodes.includes(errorData.errorCode)
    ? errorData.errorCode
    : "404";

  return (
    <Space
      className="flex flex-col items-center justify-center w-full h-screen text-center overflow-hidden"
      style={{
        backgroundColor: colors.theme,
        color: colors.textcolor,
      }}
    >
      <Result
        status={displayCode}
        title={<Text  className="!text-2xl"  style={{ color: colors.textcolor }}>{displayCode}</Text>}
        subTitle={<Text className="!text-lg" style={{ color: colors.textcolor }}>{errorData.message}</Text>}
        extra={
          showButton && (
            <Button
              type="primary"
              onClick={() => navigate("/dashboard")}
              style={{
                backgroundColor: colors.primary,
              }}
            >
              Go Home
            </Button>
          )
        }
      />
    </Space>
  );
};

export default ErrorComponent;
