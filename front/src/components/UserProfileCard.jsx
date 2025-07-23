import {
  Avatar,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
} from "antd";
import { UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const UserProfileCard = ({ user, colors, currentProject }) => {
  return (
    <Card
      className="!h-full !rounded-2xl !shadow-lg !border-transparent !flex !flex-col"
      style={{ backgroundColor: colors.background }}
    >
      <Space
        direction="vertical"
        size="middle"
        className="!w-full"
      >
        <Row justify="center">
          <Avatar
            size={80}
            src={user.image}
            icon={!user.image && <UserOutlined />}
            style={{
              backgroundColor: colors.secondcolor,
              color: colors.initialtext,
            }}
          />
        </Row>
        <Row justify="center">
          <Col className="!text-center">
            <Title
              level={4}
              className="!mb-0"
              style={{ color: colors.textcolor }}
            >
              {user.name}
            </Title>
            <Text
              style={{ color: colors.textcolor }}
              type="secondary"
            >
              {user.email}
            </Text>
            <Flex
              justify="center"
              className="!w-full !mt-1"
            >
              <Tag color="cyan">{user.role}</Tag>
            </Flex>
          </Col>
        </Row>
        <Card
          title={
            <Title
              level={5}
              className="!text-center"
              style={{ color: colors.textcolor }}
            >
              Project & Team Details
            </Title>
          }
          styles={{
            header: {
              borderBottom: "none"
            },
            body: {
              padding: "6px 16px"
            }
          }}
          bordered={false}
          style={{ background: "transparent" }}
        >
          <Space
            direction="vertical"
            size={10}
            className="!w-full"
          >
            <Row justify="space-between">
              <Col>
                <Text
                  strong
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  Assigned Teams:
                </Text>
              </Col>
              <Col>
                <Text
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  {user.teams?.map((team) => team.team_name).join(" / ") ||
                    "No Teams Assigned"}
                </Text>
              </Col>
            </Row>
            <Row justify="space-between">
              <Col>
                <Text
                  strong
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  Current Project:
                </Text>
              </Col>
              <Col>
                <Text
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  {currentProject?.project_name || "No Current Project"}
                </Text>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Progress
                  percent={
                    user.projectProgress?.find(
                      (p) => parseInt(p.projectId) === user.current_project_id
                    )?.progress || 0
                  }
                  strokeColor={{
                    from: colors.secondcolor,
                    to: colors.primary,
                  }}
                  status="active"
                  showInfo={true}
                  format={(percent) => `${percent}%`}
                  trailColor={colors.secondcolor}
                />
              </Col>
            </Row>
          </Space>
        </Card>
        <Card
          title={
            <Title
              level={5}
              className="!text-center"
              style={{ color: colors.textcolor }}
            >
              Contribution Summary
            </Title>
          }
          styles={{
            header: {
              borderBottom: "none"
            },
            body: {
              padding: "6px 16px"
            }
          }}
          bordered={false}
          style={{ background: "transparent" }}
        >
          {[
            ["Total Time Spent:", `${Math.round(user.totalTime / 60)} hrs`],
            ["Discussions Participated:", user.discussions],
            ["Comments Made:", user.comments],
            ["Replies Posted:", user.replies],
          ].map(([label, value]) => (
            <Row
              justify="space-between"
              style={{ marginBottom: 6 }}
              key={label}
            >
              <Col>
                <Text
                  strong
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  {label}
                </Text>
              </Col>
              <Col>
                <Text
                  className="!text-xs"
                  style={{ color: colors.textcolor }}
                >
                  {value}
                </Text>
              </Col>
            </Row>
          ))}
        </Card>
      </Space>
    </Card>
  );
};

export default UserProfileCard;
