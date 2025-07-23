import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Input,
  Collapse,
  Select,
  Typography,
  Row,
  Col,
  Space,
  Flex,
  ConfigProvider,
  Tooltip,
} from "antd";
import { PlusOutlined, BookTwoTone } from "@ant-design/icons";
import { addCheat, updateCheat, resetStatus } from "../redux/cheatSheetSlice";
import { Colors } from "../config/color";
import Notifier from "../components/notifier";

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

let nextSnippetId = 1;
let nextSectionId = 1;

const createEmptySnippet = () => ({
  id: nextSnippetId++,
  language: "Snippet",
  code: "",
  description: "",
});

const createEmptySection = () => ({
  id: nextSectionId++,
  title: "",
  description: "",
  snippets: [createEmptySnippet()],
});

const CheatsheetFormPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { cheats, error } = useSelector((state) => state.cheats);
  const [editingSectionIndex, setEditingSectionIndex] = useState(null);
  const [titleError, setTitleError] = useState(""); 
  const titleInputRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sections: [],
    currentSection: createEmptySection(),
  });

  const colors = Colors();
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      const cheat = cheats.find((c) => c.id === parseInt(id));
      if (cheat) {
        setForm({
          title: cheat.title,
          description: cheat.description,
          sections: cheat.sections || [],
          currentSection: createEmptySection(),
        });
      } else {
        navigate("/cheatsheets");
      }
    }
  }, [id, cheats, navigate, isEditing]);

    useEffect(() => {
    if (error) {
      Notifier({
        type: "error",
        title: "Error",
        description: error,
        duration: 3,
        placement: "bottomRight",
        colors,
      });
      dispatch(resetStatus());
    }
  }, [error, dispatch, colors]);

  const handleAddSection = () => {
    if (form.currentSection.title.trim() !== "") {
      if (editingSectionIndex !== null) {
        const updatedSections = [...form.sections];
        updatedSections.splice(editingSectionIndex, 0, form.currentSection);
        setForm({
          ...form,
          sections: updatedSections,
          currentSection: createEmptySection(),
        });
        setEditingSectionIndex(null);
      } else {
        setForm({
          ...form,
          sections: [...form.sections, form.currentSection],
          currentSection: createEmptySection(),
        });
      }
    } else {
      Notifier({
        type: "error",
        title: "Section Required",
        description: "Please enter a title for the current section before adding a new one.",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
    }
  };

  const handleAddSnippet = () => {
    setForm((prev) => ({
      ...prev,
      currentSection: {
        ...prev.currentSection,
        snippets: [...prev.currentSection.snippets, createEmptySnippet()],
      },
    }));
  };

  const handleEditSection = (index) => {
    const sectionToEdit = form.sections[index];
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
      currentSection: {
        ...sectionToEdit,
        snippets: sectionToEdit.snippets.map((snippet) => ({ ...snippet })),
      },
    }));
    setEditingSectionIndex(index);
  };

  const handleDeleteSection = (index) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteSnippet = (index) => {
    setForm((prev) => ({
      ...prev,
      currentSection: {
        ...prev.currentSection,
        snippets: prev.currentSection.snippets.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmit = async () => {
    const finalSections = [...form.sections];
    if (form.currentSection.title.trim() !== "") {
      finalSections.push(form.currentSection);
    }

    if (form.title.trim() === "") {
      setTitleError("Please enter a title for your cheatsheet."); 
      titleInputRef.current.focus(); 
      return;
    }

    if (finalSections.length === 0) {
      Notifier({
        type: "error",
        title: "Sections Required",
        description: "Please add at least one section to your cheatsheet.",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
      return;
    }
    setTitleError("");

    const data = {
      title: form.title,
      description: form.description,
      sections: finalSections,
    };

    if (isEditing) {
      await dispatch(updateCheat({ id: parseInt(id), ...data })).unwrap();
      Notifier({
        type: "success",
        title: "Success",
        description: "Cheatsheet has been successfully updated.",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
    } else {
       await dispatch(addCheat(data)).unwrap();
      Notifier({
        type: "success",
        title: "Success",
        description: "New cheatsheet has been successfully created.",
        duration: 3,
        placement: "bottomRight",
        colors,
      });
    }
    navigate("/cheatsheets");
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          motion: false,
          colorBgContainer: colors.background,
          colorText: colors.textcolor,
          colorBgElevated: colors.background,
          colorPrimary: colors.menuhover,
          colorBorder: colors.border,
        },
      }}
    >
      <Space direction="vertical" size="large" className="p-6 !w-full">
        <Flex align="center" style={{ marginBottom: 24 }}>
          <BookTwoTone className="!text-[24px] !mr-2 !align-middle" />
          <Title className="!text-2xl !font-semibold !m-0" level={3}>
            {isEditing ? "Edit Cheatsheet" : "Create New Cheatsheet"}
          </Title>
        </Flex>

        <Space direction="vertical" size="middle"className="!w-full" style={{ marginBottom: 24 }}>
          <Title level={4}>Basic Information</Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text>Cheatsheet Title : </Text>
              <Input
                placeholder="e.g., Git Commands"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  setTitleError("");
                }}
                ref={titleInputRef}
                status={titleError ? "error" : ""}
                style={titleError ? { borderColor: colors.danger } : {}}
              />
              {titleError && (
                <Text
                  style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}
                >
                  {titleError}
                </Text>
              )}
            </Col>
            <Col span={24}>
              <Text>Description : </Text>
              <TextArea
                placeholder="Brief description of this cheatsheet"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </Col>
          </Row>
        </Space>

        <Space direction="vertical" size="middle" className="!w-full">
          <Flex justify="space-between" align="center" style={{ margin: 10 }}>
            <Title level={4}>Sections</Title>
            <Button
              style={{
                background: colors.primary,
                color: colors.white,
                borderColor: colors.primary,
              }}
              icon={<PlusOutlined />}
              onClick={handleAddSection}
            >
              {editingSectionIndex !== null ? "Update Section" : "Add Section"}
            </Button>
          </Flex>

          {form.sections.length > 0 && (
            <Collapse style={{ marginBottom: 24 }}>
              {form.sections.map((section, index) => (
                <Panel
                  key={section.id}
                  header={
                    <Tooltip title={section.title || "Untitled Section"}>
                      <Text className="!text-lg block truncate max-w-[200px]">
                        {section.title || "Untitled Section"}
                      </Text>
                    </Tooltip>
                  }
                  extra={
                    <Space onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        icon={
                          <Icon
                            icon="mdi:pencil"
                            width="18"
                            className={`cursor-pointer ${colors.darkGray}`}
                          />
                        }
                        onClick={() => handleEditSection(index)}
                      />
                      <Button
                        type="text"
                        danger
                        icon={
                          <Icon
                            icon="mdi:trash-can"
                            width="18"
                            className="text-red-400"
                          />
                        }
                        onClick={() => handleDeleteSection(index)}
                      />
                    </Space>
                  }
                >
                  <Paragraph>{section.description}</Paragraph>
                  {section.snippets.length > 0 && (
                    <Space direction="vertical" className="!w-full !mt-0">
                      {section.snippets.map((snippet) => (
                        <Space direction="vertical" size="middle"
                          key={snippet.id}
                          className="!w-full !rounded-lg !p-4"
                          style={{ border: `1px solid ${colors.border}` }}
                        >
                          <Flex
                            justify="space-between"
                            align="center"
                            style={{ marginBottom: 8 }}
                          >
                            <Text type="secondary">
                              Language: {snippet.language}
                            </Text>
                          </Flex>
                          <pre
                            className="!p-3 !rounded !border !overflow-auto"
                            style={{ border: `1px solid ${colors.border}` }}
                          >
                            {snippet.code}
                          </pre>
                          {snippet.description && (
                            <Paragraph style={{ marginTop: 8 }}>
                              {snippet.description}
                            </Paragraph>
                          )}
                        </Space>
                      ))}
                    </Space>
                  )}
                </Panel>
              ))}
            </Collapse>
          )}

          <Space direction="vertical" size="middle"
            className="!w-full !rounded-lg !p-4 !mt-2"
            style={{ background: colors.background }}
          >
            <Title level={5}>Current Section</Title>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Text>Section Title : </Text>
                <Input
                  placeholder="e.g., Basic Commands"
                  value={form.currentSection.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currentSection: {
                        ...prev.currentSection,
                        title: e.target.value,
                      },
                    }))
                  }
                />
              </Col>
              <Col span={24}>
                <Text>Section Description : </Text>
                <TextArea
                  placeholder="Brief description of this section"
                  value={form.currentSection.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      currentSection: {
                        ...prev.currentSection,
                        description: e.target.value,
                      },
                    }))
                  }
                  rows={2}
                />
              </Col>
            </Row>

            <Space direction="vertical" size="middle" className="!w-full" style={{ width: "100%", marginTop: 24 }}>
              <Flex
                justify="space-between"
                align="center"
                style={{ marginBottom: 16 }}
              >
                <Title level={5}>Code Snippets</Title>
                <Button
                  type="dashed"
                  style={{
                    color: colors.sidebarbg,
                    borderColor: colors.sidebarbg,
                  }}
                  icon={<PlusOutlined />}
                  onClick={handleAddSnippet}
                >
                  Add Snippet
                </Button>
              </Flex>

              <Space direction="vertical" style={{ width: "100%" }}>
                {form.currentSection.snippets.map((snippet, index) => (
                  <Space direction="vertical"  size="middle"
                    key={snippet.id}
                    className="!w-full !rounded-lg !p-4"
                    style={{ border: `1px solid ${colors.border}` }}
                  >
                    <Flex
                      justify="space-between"
                      align="center"
                      style={{ marginBottom: 8 }}
                    >
                      <Title level={5} style={{ margin: 0 }}>
                        Snippet {index + 1}
                      </Title>
                      <Button
                        type="text"
                        danger
                        icon={
                          <Icon
                            icon="mdi:trash-can"
                            width="18"
                            className="text-red-400"
                          />
                        }
                        onClick={() => handleDeleteSnippet(index)}
                        size="small"
                      />
                    </Flex>
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Text>Language : </Text>
                        <Select
                          value={snippet.language}
                          onChange={(value) => {
                            const newSnippets = [
                              ...form.currentSection.snippets,
                            ];
                            newSnippets[index] = {
                              ...newSnippets[index],
                              language: value,
                            };
                            setForm((prev) => ({
                              ...prev,
                              currentSection: {
                                ...prev.currentSection,
                                snippets: newSnippets,
                              },
                            }));
                          }}
                          style={{ width: "100%" }}
                        >
                          {[
                            "JavaScript",
                            "Python",
                            "TypeScript",
                            "HTML",
                            "CSS",
                            "Java",
                            "C#",
                            "SQL",
                            "PHP",
                            "Command",
                            "Other",
                          ].map((lang) => (
                            <Select.Option key={lang} value={lang}>
                              {lang}
                            </Select.Option>
                          ))}
                        </Select>
                      </Col>
                      <Col span={24}>
                        <Text> Code : </Text>
                        <TextArea
                          placeholder="Enter your code snippet here..."
                          value={snippet.code}
                          onChange={(e) => {
                            const newSnippets = [
                              ...form.currentSection.snippets,
                            ];
                            newSnippets[index] = {
                              ...newSnippets[index],
                              code: e.target.value,
                            };
                            setForm((prev) => ({
                              ...prev,
                              currentSection: {
                                ...prev.currentSection,
                                snippets: newSnippets,
                              },
                            }));
                          }}
                          rows={4}
                          style={{ fontFamily: "monospace" }}
                        />
                      </Col>
                      <Col span={24}>
                        <Text>Description : </Text>
                        <TextArea
                          placeholder="Brief explanation of this code snippet"
                          value={snippet.description}
                          onChange={(e) => {
                            const newSnippets = [
                              ...form.currentSection.snippets,
                            ];
                            newSnippets[index] = {
                              ...newSnippets[index],
                              description: e.target.value,
                            };
                            setForm((prev) => ({
                              ...prev,
                              currentSection: {
                                ...prev.currentSection,
                                snippets: newSnippets,
                              },
                            }));
                          }}
                          rows={2}
                        />
                      </Col>
                    </Row>
                  </Space>
                ))}
              </Space>
            </Space>
          </Space>
        </Space>

        <Flex
          className="!ml-5 !mr-5"
          justify="flex-end"
          style={{ marginTop: 24 }}
        >
          <Button
            style={{
              color: colors.danger,
              borderColor: colors.danger,
              marginRight: 8,
            }}
            onClick={() => navigate("/cheatsheets")}
          >
            Cancel
          </Button>
          <Button
            className="!ml-2 !mr-2"
            style={{
              background: colors.primary,
              color: colors.white,
              borderColor: colors.primary,
            }}
            onClick={handleSubmit}
          >
            {isEditing ? "Update" : "Create"} Cheatsheet
          </Button>
        </Flex>
      </Space>
    </ConfigProvider>
  );
};

export default CheatsheetFormPage;
