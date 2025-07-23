import { useSelector } from "react-redux";
import { theme } from "antd";
import { useEffect, useState } from "react";

export const Colors = () => {
  const { isDarkTheme } = useSelector((state) => state.navbar);
  const { token } = theme.useToken();
  const [colors, setColors] = useState({
    avatarColors: ["#1E90FF", "#DC143C", "#9932CC"],
  });

  useEffect(() => {
    setColors({
      avtar: token.colorTextSecondary,
      avatarGray: token.colorTextDisabled,
      avatarBg: token.colorFillSecondary,
      avatarText: token.colorTextSecondary,
      avatarOverflowBg: token.colorFillTertiary,
      avatarColors: ["#1E90FF", "#DC143C", "#9932CC"],

      background: isDarkTheme ? "#1e293b" : "#ffffff",
      border: token.colorBorder,
      behind: token.colorError,
      btnText: token.colorPrimaryText,
      bordercolor: token.colorBorder,
      black: token.colorTextBase,
      badges: isDarkTheme ? "#192232" : "#f9f9fa",
      badges_text: isDarkTheme ? "#3D9F66" : "#006400",
      botuserbg: isDarkTheme ? "#1D2753" : "#CFDCF7",

      clerktheme: isDarkTheme ? "dark" : "light",
      completed: token.colorSuccess,
      countbg: token.colorFillTertiary,
      countText: "#000",

      dashheaderbg: isDarkTheme ? "#333476" : "#624bff",
      dtlogobg: token.colorInfoBgHover,
      danger: token.colorError,
      darkgray: isDarkTheme ? "#475569" : "#E5E6E7",
      disabledbg: token.colorFillQuaternary,
      disabledtext: token.colorTextDisabled,

      Editorbg: isDarkTheme ? "#1E1E1E" : "#FAFAFA",
      errorMsg: token.colorError,

      hoverGray: token.colorFillSecondary,
      notification: isDarkTheme ? "##242C4F" : "#EFF6FF",

      initialtext: isDarkTheme ? "#AFBAEA" : "#624bff",
      inputborder: isDarkTheme ? "#cacbcd" : "#3C3C3C",
      inProgress: token.colorWarning,

      lightGrey: token.colorBorderSecondary,
      logobg: isDarkTheme ? "#333476" : "#d0c9ff",
      logo: token.colorTextHeading,

      menuhover: token.colorPrimaryHover,
      monachotheme: isDarkTheme ? "vs-dark" : "vs",
      maskbg: token.colorFillSecondary,
      modaltext: token.colorTextSecondary,

      primary: "#624bff",
      placeholderGray: "#cacbcd",
      primaryPurple: token.colorPrimary,
      progressback: isDarkTheme ? "#656F78" : "#E9EAEB",
      PaleLeaf: "linear-gradient(135deg, #183c2f, rgb(70, 105, 54))",

      sidebarbg: "#624bff",
      sidebartext: token.colorTextSecondary,
      secondary: token.colorBgLayout,
      secondcolor: isDarkTheme ? "#333476" : "#d0c9ff",
      success: token.colorSuccess,
      SoftGray: token.colorFillSecondary,

      theme: isDarkTheme ? "#0f172a" : "#f1f5f9",
      transparent: token.colorBgBlur,
      text: token.colorText,
      textgray: token.colorTextSecondary,
      themetext: token.colorTextHeading,
      textcolor: token.colorText,
      tableHeaderBg: token.colorBgContainer,
      tableHoverBg: token.colorFillTertiary,
      tablebody: token.colorBgContainer,
      filebtn: isDarkTheme ? "#334155" : "#f0f4f8",
      update: "#1890ff",
      chartbg:"#FF4069",

      warning: token.colorWarning,
      white: token.colorWhite,
      clerkbg:isDarkTheme ? "#1F1F23" : "#ffffff",

      statusColors: {
        PENDING: { textColor: "#FFD700", progressColor: "#FFD700" },
        IN_PROGRESS: { textColor: "#1E90FF", progressColor: "#1E90FF" },
        COMPLETED: { textColor: "#36D399", progressColor: "#36D399" },
        Default: { textColor: "#DC143C", progressColor: "#DC143C" },
      },
    });
  }, [token, isDarkTheme]);

  return colors;
};
