import { Flex, Empty, Typography, Button } from "antd";
import { useNavigate } from "react-router-dom";
import { Colors } from "../config/color";

const NoLearning = () => {
  const colors = Colors();
  const navigate = useNavigate();

  return (
    <Flex
      vertical
      justify="center"
      align="center"
      className="!h-screen !text-center"
    >
      <Empty
        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
        imageStyle={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          margin: "auto",
        }}
        description={
          <Typography.Title
            level={4}
            style={{ color: colors.textcolor }}
          >
            You have not started learning yet
          </Typography.Title>
        }
      />
      <Button
        type="primary"
        onClick={() => navigate("/projects")}
      >
        Begin Your Journey
      </Button>
    </Flex>
  );
};

export default NoLearning;
