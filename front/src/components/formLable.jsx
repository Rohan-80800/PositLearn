import { Typography } from "antd";

const { Text } = Typography;
const FormLabel = ({ text, required = false }) => {
  return (
    <Text>
      {text}
      {required && <Text type="danger">*</Text>}
    </Text>
  );
};

export default FormLabel;
