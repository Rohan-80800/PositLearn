import { notification, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";

const { Text } = Typography;

const Notifier = ({
  type = "info",
  description = "",
  title = "",
  duration = 3,
  placement = "bottomRight",
  colors,
}) => {
  notification[type]({
    message: (
      <Text style={{ color: colors.textcolor }}>
        {title || type.charAt(0).toUpperCase() + type.slice(1)}
      </Text>
    ),
    description: <Text style={{ color: colors.textcolor }}>{description}</Text>,
    duration,
    placement,
    closeIcon: <CloseOutlined style={{ color: colors.textcolor }} />,
    style: { backgroundColor: colors.background },
  });
};

export default Notifier;
