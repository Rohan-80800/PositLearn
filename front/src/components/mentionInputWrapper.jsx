import React, { useEffect, useRef } from "react";
import { MentionsInput, Mention } from "react-mentions";
import api from "../axios";
import { Avatar, Space, Typography } from "antd";
import { Colors } from "../config/color";

const MentionInputWrapper = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const colors = Colors();
  const { Text } = Typography;

  const fetchUsers = async (query, callback) => {
    try {
      const response = await api.get("/api/user/get");
      const users = response.data.data.map((user) => ({
        id: user.clerk_id,
        display: `${user.first_name} ${user.last_name}`,
        fullDisplay: `${user.first_name} ${user.last_name} (${user.email})`,
        image: user.user_image
        ? user.user_image.replace("data:image/png;base64,", "")
        : null,
      }));
      const filteredUsers = query
        ? users.filter((user) =>
            user.display.toLowerCase().includes(query.toLowerCase())
          )
        : users;
      callback(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      callback([]);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      const input = inputRef.current.querySelector("textarea");
      if (input && document.activeElement !== input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  }, [value]);

  return (
    <MentionsInput
      inputRef={inputRef}
      value={value || ""}
      onChange={(e, newValue) => onChange(newValue)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      allowSuggestionsAboveCursor={true}
      style={{
        control: {
          backgroundColor: colors.background,
          border: "none",
          outline: "none",
        },
        input: {
          border: "none",
          outline: "none",
          backgroundColor: colors.background,
          color: colors.textcolor,
          resize: "none",
          paddingLeft: "8px",
        },
        suggestions: {
          backgroundColor: colors.background,
          list: {
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.textcolor,
            borderRadius: "10px",
          },
          item: {
            padding: "5px 15px",
            "&focused": {
              backgroundColor: colors.hoverGray,
              borderRadius: "5px",
            },
          },
        },
      }}
      className="!w-full"
      a11ySuggestionsListLabel="Suggested mentions"
    >
      <Mention
        trigger="@"
        data={fetchUsers}
        renderSuggestion={(user) => (
          <Space className="flex items-center gap-2 m-0.5 p-0.5">
            <Avatar src={user.image} size={24} style={{ minWidth: "24px" }} />
            <Text>{user.fullDisplay}</Text>
          </Space>
        )}
        markup="@**__display__**"
        displayTransform={(id, display) => `@**${display}** `}
        style={{ backgroundColor: "#e6f0ff", color: "#1a73e8" }}
      />
    </MentionsInput>
  );
};

export default MentionInputWrapper;
