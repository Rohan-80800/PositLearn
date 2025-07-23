import { useState, useEffect } from "react";
import { Card, Modal, Progress, Image, Tooltip, Typography, Space } from "antd";
import { LockFilled } from "@ant-design/icons";
import { motion } from "framer-motion";
import defaultBadgeImage from "../assets/badge2.png";

const BadgeCard = ({
  date,
  image,
  title,
  description,
  project,
  colors,
  badge_specific_progress,
  is_special,
  progress_required,
  initialModalVisible = false,
  onModalClose,
  modalOnly = false,
  autoClose,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(initialModalVisible);
  const Image_URL = import.meta.env.VITE_SERVER_URL.replace(/\/$/, "");

  const { Title, Text, Paragraph } = Typography;

  useEffect(() => {
    setIsModalVisible(initialModalVisible);
  }, [initialModalVisible]);

  useEffect(() => {
    if (isModalVisible && autoClose && modalOnly) {
      const timer = setTimeout(() => {
        setIsModalVisible(false);
        if (onModalClose) onModalClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isModalVisible, autoClose, modalOnly, onModalClose]);

  const handleModalClose = () => {
    setIsModalVisible(false);
    if (onModalClose) onModalClose();
  };

  const cardVariants = {
    hover: { scale: 1.05, boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.2)" },
    tap: { scale: 0.95 },
    initial: { scale: 1 },
  };

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  let badgeImage = defaultBadgeImage;

  if (image) {
    if (import.meta.env.VITE_ENV === "dev") {
      badgeImage = `${Image_URL}${image}`;
    } else {
      badgeImage = image;
    }
  }

  const modalContent = (
    <Modal
      title={null}
      open={isModalVisible}
      onCancel={handleModalClose}
      footer={null}
      width="90vw"
      style={{ backgroundColor: colors.badges }}
      className="!max-w-[400px] !text-center"
      centered
    >
      <motion.div initial="hidden" animate="visible" variants={badgeVariants}>
        <Title
          ellipsis={{ tooltip: title }}
          level={3}
          style={{ color: colors.darkBlueGray }}
        >
          {title}
        </Title>
        {date ? (
          <motion.img
            src={badgeImage}
            alt={title}
            className="!w-32 !h-32 !mx-auto !mb-4 md:!w-40 md:!h-40"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            onError={(e) => {
              e.target.src = defaultBadgeImage;
            }}
          />
        ) : (
          <motion.img
            src={badgeImage}
            alt={title}
            className="!w-32 !h-32 !mx-auto !mb-4 md:!w-40 md:!h-40 !grayscale !opacity-40"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            onError={(e) => {
              e.target.src = defaultBadgeImage;
            }}
          />
        )}
        <Paragraph className="!text-sm !mb-4 !text-gray-500">
          {description}
        </Paragraph>
        {date && (
          <Paragraph className="!text-sm !text-gray-500">{`Awarded on ${date}`}</Paragraph>
        )}
        {project && (
          <Paragraph className="!text-sm !font-semibold !text-[#4A90E2]">
            <Text className="!font-normal !text-gray-500">Project Name : </Text>
            {project}
          </Paragraph>
        )}
        {progress_required && !date ? (
          <Paragraph className="!text-sm !font-semibold !text-[#4A90E2] !mt-4">
            <Text className="!font-normal !text-gray-500">
              Required progress to achieve badge -{" "}
            </Text>
            {progress_required} %
          </Paragraph>
        ) : (
          <Paragraph className="!text-sm !font-semibold !text-[#4A90E2] !mt-4">
            <Text className="!font-normal !text-gray-500">
              Badge Achieved after completing -{" "}
            </Text>
            {progress_required} %
          </Paragraph>
        )}

        {badge_specific_progress !== null &&
        badge_specific_progress !== undefined &&
        !date ? (
          <Space direction="vertical" className="w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, ease: "easeInOut" }}
            >
              <Progress
                percent={badge_specific_progress}
                strokeColor="#4A90E2"
                trailColor="#D3E5FA"
                strokeWidth={8}
                showInfo={false}
              />
            </motion.div>
            <Paragraph className="!text-sm !text-gray-500 !mt-2">{`${badge_specific_progress}% Complete`}</Paragraph>
          </Space>
        ) : (
          <></>
        )}
        {is_special && (
          <Paragraph className="!text-xs !text-yellow-600 !mt-2">
            Special Achievement
          </Paragraph>
        )}
      </motion.div>
    </Modal>
  );

  if (modalOnly) {
    return modalContent;
  }

  return (
    <>
      <motion.div
        variants={cardVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        className="relative"
      >
        <Card
          className="rounded-lg !shadow-md"
          style={{ backgroundColor: colors.badges }}
          bodyStyle={{
            padding: "18px 18px 0",
            display: "flex",
            flexDirection: "column",
            minHeight: "160px",
            overflow: "hidden",
          }}
          onClick={() => setIsModalVisible(true)}
          hoverable
        >
          {date && (
            <Paragraph className="!text-xs">{`Awarded on ${date}`}</Paragraph>
          )}

          <Space
            direction="horizontal"
            align="center"
            className="!flex-1 !w-full"
            size={20}
          >
            <Image
              src={badgeImage}
              alt={title}
              width={90}
              className={`!object-contain !flex-shrink-0 ${
                !date ? "!opacity-20 !grayscale" : ""
              }`}
              preview={false}
            />
            <Space direction="vertical" className="!flex-1 !min-w-0" size={2}>
              <Title
                level={5}
                ellipsis={{ tooltip: title, rows: 2 }}
                className={`!text-base !font-bold md:!text-lg !m-0 ${
                  !date ? "!text-gray-400" : ""
                }`}
              >
                {title}
              </Title>
              <Paragraph
                ellipsis={{ rows: 1, tooltip: project }}
                className="!text-base md:!text-xs !font-bold !whitespace-nowrap !overflow-hidden !text-ellipsis !text-gray-500 !m-0"
              >
                {project}
              </Paragraph>

              <Paragraph
                ellipsis={{ rows: 2, tooltip: description }}
                className="!text-xs !leading-tight !text-gray-500 !m-0"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                }}
              >
                {description}
              </Paragraph>
            </Space>
          </Space>
          {!date && (
            <Space
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 flex justify-center items-center"
              align="center"
              justify="center"
            >
              <Tooltip title="Locked">
                <LockFilled
                  className="!text-sm !p-2 !rounded-full !bg-gray-800/90 !text-white"
                  style={{ color: colors.textgray }}
                />
              </Tooltip>
            </Space>
          )}

          {badge_specific_progress && !date ? (
            <Progress
              percent={badge_specific_progress}
              showInfo={false}
              strokeColor="#4A90E2"
              trailColor="#D3E5FA"
              strokeWidth={5}
              className="!w-full !m-0 !p-0 !absolute !left-0 -bottom-[6px]"
            />
          ) : (
            <></>
          )}
        </Card>
      </motion.div>
      {modalContent}
    </>
  );
};

export default BadgeCard;
