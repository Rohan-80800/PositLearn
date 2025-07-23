import { Avatar, Tooltip, Space } from "antd";
import { Colors } from "../config/color";

const AvatarGroup = ({ members = [], maxVisible = 3 }) => {
  const colors = Colors();
  const getColor = (index) =>
    colors.avatarColors[index % colors.avatarColors.length];

  return (
    <Space className="!flex !overflow-hidden">
      {members.slice(0, maxVisible).map((member, index) => (
        <Tooltip key={index} title={member.name}>
          <Avatar
            size={30}
            className={`!font-bold !text-[12px] !border-2 ${
              index === 0 ? "!ml-0" : "!-ml-5"
            }`}
            style={
              member.user_image
                ? { borderColor: colors.background }
                : {
                    backgroundColor: getColor(index),
                    borderColor: colors.background,
                  }
            }
            src={member.user_image || undefined}
          >
            {!member.user_image && member.name.charAt(0).toUpperCase()}
          </Avatar>
        </Tooltip>
      ))}
      {members.length > maxVisible && (
        <Avatar
          size={30}
          className="!text-[12px] bold !border-2 !-ml-6"
          style={{
            backgroundColor: colors.theme,
            color: colors.black,
            borderColor: colors.background,
          }}
        >
          +{members.length - maxVisible}
        </Avatar>
      )}
    </Space>
  );
};

export default AvatarGroup;
