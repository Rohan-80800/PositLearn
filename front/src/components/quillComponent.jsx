import React, { useRef, useMemo } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import Emoji from "quill-emoji";
import "quill-emoji/dist/quill-emoji.css";
import { Colors } from "../config/color";
import "../App.css";
import { Space } from "antd";

Quill.register("modules/emoji", Emoji);

const QuillEditor = ({
  value,
  onChange,
  toolbarOptions = "full",
  onFilesChange,
  isDarkTheme = false,
  className = "custom-quill",
  ...props
}) => {
  const quillRef = useRef(null);
  const colors = Colors();

  const toolbarConfigs = {
    full: [
      [{ size: [] }],
      [{ font: [] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "image"],
      [{ align: [] }],
      ["blockquote", "code-block", "clean", "emoji"],
    ],
    minimal: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
    ],   
  };

  const getToolbar = () => {
    if (Array.isArray(toolbarOptions)) return toolbarOptions;
    return toolbarConfigs[toolbarOptions] || toolbarConfigs.full;
  };

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.setAttribute("multiple", "true");
    input.click();

    input.onchange = () => {
      const files = Array.from(input.files);
      if (files.length && onFilesChange) {
        onFilesChange(files);
      }
    };
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: getToolbar(),
        handlers: {
          image: imageHandler,
        },
      },
      "emoji-toolbar": true,
      "emoji-textarea": true,
      "emoji-shortname": true,
      clipboard: {
        matchVisual: false,  
      },
    }),
    [toolbarOptions]
  );

  return (
    <Space
     className="custom-quill"
      data-theme={isDarkTheme ? "dark" : "light"}
      style={{ height: "220px" }}
    >
      <ReactQuill
        ref={quillRef}
        value={value || ""}
        onChange={onChange}
        modules={modules}
        theme="snow"
        className={className}
        style={{
          color: colors.textcolor,
          backgroundColor: colors.background,
          "--quill-border-color": colors.border,
          height: "150px",
        }}
        {...props}
      />
    </Space>
  );
};

export default QuillEditor;
