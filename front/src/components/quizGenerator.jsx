import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Button,
  Modal,
  Input,
  Select,
  Card,
  ConfigProvider,
  Typography,
  Space,
  Empty,
  Avatar,
  Checkbox,
  Affix,
  Flex,
  Row,
  Col,
} from "antd";
import { Icon } from "@iconify/react";
import {
  fetchQuizzes,
  createQuizAsync,
  updateQuizAsync,
  deleteQuizAsync,
  setModalState,
  setQuizData,
  setDeleteModal,
  fetchProjects,
  fetchModules,
  fetchVideos,
  updateVideoData,
} from "../redux/quizSlice";
import { Colors } from "../config/color";
import CustomTable from "./customTable";
import ConfirmDeleteModal from "./confirm_delete_modal";
import { showLoader, hideLoader } from "../redux/loderSlice";
import Loader from "./loader";
import Notifier from "./notifier";

const { Text, Title } = Typography;

const extractYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = urlOrId.match(regex);
  return match ? match[1] : urlOrId.length === 11 ? urlOrId : null;
};

const QuizGenerator = () => {
  const colors = Colors();
  const dispatch = useDispatch();
  const projectRef = useRef(null);
  const moduleRef = useRef(null);
  const titleRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [errors, setErrors] = useState({
    project: "",
    module: "",
    videoData: "",
    title: "",
    difficulty: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showViewQuestionsModal, setShowViewQuestionsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addQuestionsState, setAddQuestionsState] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [filters, setFilters] = useState({
    module: "",
    project: "",
    search: "",
    difficulty: "",
  });
  const [manualQuestion, setManualQuestion] = useState({
    videoId: null,
    text: "",
    options: ["", "", "", ""],
    correct: "",
  });

  const {
    quizzes,
    modalState,
    quizData,
    projectOptions,
    moduleOptions,
    videoOptions,
    deleteModal,
    loading,
    error,
  } = useSelector((state) => state.quiz || {});

  const difficultyOptions = [
    { label: "Easy", value: "easy" },
    { label: "Medium", value: "medium" },
    { label: "Hard", value: "hard" },
  ];

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch(showLoader());
        await Promise.all([
          dispatch(fetchProjects()).unwrap(),
          dispatch(fetchQuizzes()).unwrap(),
          dispatch(fetchModules()).unwrap(),
        ]);
      } catch (error) {
        console.error("Failed to load some initial data:", error);
      } finally {
        dispatch(hideLoader());
      }
    };

    loadInitialData();
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const themeConfig = {
    token: {
      colorBgContainer: colors.background,
      colorText: colors.textcolor,
      colorBgElevated: colors.background,
      colorPrimary: colors.primary,
      colorBorderSecondary: colors.border,
    },
    components: {
      Card: {
        colorBgContainer: colors.background,
        colorText: colors.textcolor,
        colorBorder: colors.background,
      },
      Table: {
        headerColor: colors.textcolor,
        colorText: colors.textcolor,
        rowHoverBg: colors.theme,
      },
      Select: {
        optionSelectedBg: colors.theme,
        colorTextPlaceholder: colors.placeholderGray,
        colorIcon: colors.textcolor,
        optionActiveBg: colors.hoverGray,
        colorBgContainer: "transparent",
        colorBorder: colors.border,
      },
      Modal: {
        titleColor: colors.textcolor,
        colorIcon: colors.textcolor,
      },
      Input: {
        colorBorder: colors.border,
        colorBgContainer: "transparent",
        colorText: colors.textcolor,
        colorTextPlaceholder: colors.placeholderGray,
        colorTextDisabled: colors.placeholderGray,
        controlOutline: "none",
      },
      Radio: {
        colorText: colors.textcolor,
        colorPrimary: colors.primary,
      },
    },
  };

  const filteredQuizzes = quizzes
    .filter((quiz) =>
      filters.search
        ? quiz.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
          quiz.module_title
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          projectOptions
            .find((p) => p.id === quiz.project_id)
            ?.project_name?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          quiz.difficulty?.toLowerCase().includes(filters.search.toLowerCase())
        : true
    )
    .filter((quiz) =>
      filters.module ? quiz.module_title === filters.module : true
    )
    .filter((quiz) =>
      filters.project
        ? projectOptions.find((p) => p.id === quiz.project_id)?.project_name ===
          filters.project
        : true
    )
    .filter((quiz) =>
      filters.difficulty ? quiz.difficulty === filters.difficulty : true
    );

  const sortedQuizzes = [...filteredQuizzes].sort((a, b) => b.id - a.id);

  const updateQuizData = (updatedValues) => {
    dispatch(setQuizData({ ...quizData, ...updatedValues }));
    setErrors((prev) => ({
      ...prev,
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {
      project: !quizData.projectId ? "Project is required." : "",
      module: !quizData.moduleId ? "Module is required." : "",
      videoData:
        quizData.videoData.length === 0 ||
        quizData.videoData.some(
          (v) =>
            !v.videoId ||
            !v.numQuestions ||
            v.numQuestions <= 0 ||
            v.videoId.length !== 11
        )
          ? "At least one valid YouTube video with a positive number of questions is required."
          : "",
      title: !quizData.title?.trim() ? "Quiz title is required." : "",
      difficulty: !quizData.difficulty ? "Difficulty level is required." : "",
    };
    setErrors(newErrors);
    const fieldPriority = ["project", "module", "title", "difficulty"];
    const refs = {
      project: projectRef,
      module: moduleRef,
      title: titleRef,
    };

    fieldPriority.some((key) => {
      if (newErrors[key]) {
        if (refs[key]) refs[key]?.current?.focus();
        return true;
      }
      return false;
    });

    return !Object.values(newErrors).some((error) => error);
  };

  const openModal = (isEdit = false, quiz = null) => {
    setIsLoading(false);

    dispatch(setModalState({ isOpen: true, isEdit, editId: quiz?.id || null }));
    if (isEdit && quiz) {
      dispatch(fetchModules(quiz.project_id)).then(() => {
        dispatch(fetchVideos(quiz.module_id)).then(() => {
          const videoQuestionCounts = {};
          const enrichedQuizContent = quiz.quiz_content.map((q, index) => {
            const videoId =
              quiz.video_ids.find((vid, i) => q.order_id === i + 1) ||
              quiz.video_ids[0];
            videoQuestionCounts[videoId] =
              (videoQuestionCounts[videoId] || 0) + 1;
            return {
              text: q.text,
              correct: q.correct,
              options: q.options,
              order_id: q.order_id || index + 1,
              question_id: index + 1,
              video_question_id: videoQuestionCounts[videoId],
              id: index,
              selected: true,
            };
          });
          updateQuizData({
            projectId: quiz.project_id,
            moduleId: quiz.module_id,
            videoData: quiz.video_ids.map((videoId, index) => ({
              videoId,
              numQuestions: quiz.quiz_content.filter(
                (q) => q.order_id === index + 1
              ).length,
              order_id: index + 1,
            })),
            title: quiz.title,
            difficulty: quiz.difficulty || "medium",
            quiz_content: enrichedQuizContent,
          });
          setSelectedQuestions(enrichedQuizContent);
        });
      });
    } else {
      updateQuizData({
        projectId: null,
        moduleId: null,
        videoData: [],
        title: "",
        difficulty: "medium",
        quiz_content: [],
      });
      setSelectedQuestions([]);
    }
    setErrors({
      project: "",
      module: "",
      videoData: "",
      title: "",
      difficulty: "",
    });
    setShowViewQuestionsModal(false);
    setAddQuestionsState({});
    setManualQuestion({
      videoId: null,
      text: "",
      options: ["", "", "", ""],
      correct: "",
    });
    setEditingQuestion(null);
  };

  const checkDuplicateTitle = (title) => {
    return quizzes.some(
      (quiz) =>
        quiz.title?.toLowerCase() === title?.toLowerCase() &&
        (!modalState.isEdit || quiz.id !== modalState.editId)
    );
  };

  const closeModal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setShowViewQuestionsModal(false);
    setFormSubmitted(false);
    setAddQuestionsState({});
    setManualQuestion({
      videoId: null,
      text: "",
      options: ["", "", "", ""],
      correct: "",
    });
    setEditingQuestion(null);
    setSelectedQuestions([]);
    setErrors({
      project: "",
      module: "",
      videoData: "",
      title: "",
      editQuestionText: "",
      editOptions: "",
      editCorrect: "",
      manualQuestionText: "",
      manualOptions: "",
      manualCorrect: "",
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    });
    dispatch(setModalState({ isOpen: false, isEdit: false, editId: null }));
  };

  const handleGenerateQuestions = async () => {
    setFormSubmitted(true);
    if (!validateForm()) return;

    if (checkDuplicateTitle(quizData.title)) {
      setErrors((prev) => ({ ...prev, title: "Quiz title already exists" }));
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const videoData = quizData.videoData.map((v) => ({
        videoId: extractYouTubeVideoId(v.videoId),
        numQuestions: parseInt(v.numQuestions),
        order_id: parseInt(v.order_id),
      }));
      const response = await dispatch(
        fetchQuizzes({
          videoData,
          difficulty: quizData.difficulty,
          signal: controller.signal,
        })
      ).unwrap();
      if (controller.signal.aborted || !modalState.isOpen) return;

      if (response.quizzes?.length > 0) {
        const videoQuestionCounts = {};
        selectedQuestions.forEach((q) => {
          const videoId = quizData.videoData.find(
            (v) => v.order_id === q.order_id
          )?.videoId;
          if (videoId) {
            videoQuestionCounts[videoId] = Math.max(
              videoQuestionCounts[videoId] || 0,
              q.video_question_id || 0
            );
          }
        });

        const newQuestions = response.quizzes.map((q, i) => {
          const videoId = quizData.videoData.find(
            (v) => v.order_id === q.order_id
          )?.videoId;
          videoQuestionCounts[videoId] =
            (videoQuestionCounts[videoId] || 0) + 1;
          return {
            ...q,
            id: selectedQuestions.length + i,
            selected: true,
          };
        });

        const allQuestions = [...selectedQuestions, ...newQuestions]
          .sort(
            (a, b) =>
              a.order_id - b.order_id ||
              a.video_question_id - b.video_question_id
          )
          .map((q, index) => ({
            ...q,
            question_id: index + 1,
          }));

        setSelectedQuestions(allQuestions);
        setShowViewQuestionsModal(true);
      } else {
        Notifier({
          type: "error",
          title: "Quiz Generation Failed",
          description: error?.message || "No questions generated.",
          placement: "bottomRight",
          colors,
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        Notifier({
          type: "error",
          title: "Quiz Generation Failed",
          description: err.message || "Failed to generate questions.",
          placement: "bottomRight",
          colors,
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleAddMoreQuestions = async (videoId) => {
    const count = addQuestionsState[videoId]?.count;
    if (!count || count <= 0) {
      Notifier({
        type: "error",
        title: "Invalid Input",
        description: "Please enter a positive number of questions.",
        placement: "bottomRight",
        colors,
      });
      return;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    try {
      const video = quizData.videoData.find((v) => v.videoId === videoId);
      const videoData = [
        {
          videoId: extractYouTubeVideoId(videoId),
          numQuestions: parseInt(count),
          order_id: video.order_id,
        },
      ];
      const response = await dispatch(
        fetchQuizzes({
          videoData,
          difficulty: quizData.difficulty,
          signal: controller.signal,
        })
      ).unwrap();

      if (controller.signal.aborted) return;

      if (response.quizzes?.length > 0) {
        const videoQuestions = selectedQuestions.filter(
          (q) => q.order_id === video.order_id
        );
        const maxVideoQuestionId = videoQuestions.length
          ? Math.max(...videoQuestions.map((q) => q.video_question_id || 0))
          : 0;
        const newQuestions = response.quizzes.map((q, i) => ({
          ...q,
          id: selectedQuestions.length + i,
          selected: true,
          video_question_id: maxVideoQuestionId + i + 1,
        }));

        const allQuestions = [...selectedQuestions, ...newQuestions]
          .sort(
            (a, b) =>
              a.order_id - b.order_id ||
              a.video_question_id - b.video_question_id
          )
          .map((q, index) => ({
            ...q,
            question_id: index + 1,
          }));

        setSelectedQuestions(allQuestions);
        setAddQuestionsState((prev) => ({
          ...prev,
          [videoId]: { count: 0, isVisible: false },
        }));
      } else {
        Notifier({
          type: "warning",
          title: "No Additional Questions",
          description: "Could not generate more questions.",
          placement: "bottomRight",
          colors,
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        Notifier({
          type: "error",
          title: "Failed to Add Questions",
          description: err.message || "Error generating additional questions.",
          placement: "bottomRight",
          colors,
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleQuestionSelect = (questionId, selected) => {
    setSelectedQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, selected } : q))
    );
    setErrors((prev) => ({
      ...prev,
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    }));
  };

  const handleQuestionEdit = (question) => {
    setEditingQuestion({ ...question });
  };

  const handleEditSave = () => {
    const trimmedText = editingQuestion.text?.trim();
    const trimmedOptions = editingQuestion.options.map((opt) => opt?.trim());
    const trimmedCorrect = editingQuestion.correct?.trim();

    if (
      !trimmedText ||
      trimmedOptions.some((opt) => !opt) ||
      !trimmedCorrect ||
      trimmedOptions.indexOf(trimmedCorrect) === -1
    ) {
      setErrors((prev) => ({
        ...prev,
        editQuestionText: !trimmedText ? "Question text is required." : "",
        editOptions: trimmedOptions.some((opt) => !opt)
          ? "All options must be filled."
          : "",
        editCorrect:
          !trimmedCorrect || trimmedOptions.indexOf(trimmedCorrect) === -1
            ? "A valid correct answer is required."
            : "",
        submitForm: "",
        submitNoQuestions: "",
        submitZeroQuestions: "",
      }));
      return;
    }
    setSelectedQuestions((prev) =>
      prev
        .map((q) => (q.id === editingQuestion.id ? { ...editingQuestion } : q))
        .sort(
          (a, b) =>
            a.order_id - b.order_id || a.video_question_id - b.video_question_id
        )
        .map((q, index) => ({
          ...q,
          question_id: index + 1,
        }))
    );
    setErrors((prev) => ({
      ...prev,
      editQuestionText: "",
      editOptions: "",
      editCorrect: "",
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    }));
    setEditingQuestion(null);
  };

  const handleEditCancel = () => {
    setEditingQuestion(null);
  };

  const handleSubmit = () => {
    const selected = selectedQuestions.filter((q) => q.selected);
    if (Object.values(errors).some((error) => error)) {
      setErrors((prev) => ({
        ...prev,
        submitForm:
          prev.submitNoQuestions || prev.submitZeroQuestions
            ? ""
            : "Form Errors",
        submitNoQuestions: "",
        submitZeroQuestions: "",
      }));
      return;
    }
    if (selected.length === 0) {
      setErrors((prev) => ({
        ...prev,
        submitForm: "",
        submitNoQuestions: "No Questions Selected",
        submitZeroQuestions: "",
      }));
      return;
    }
    const hasZeroQuestions = quizData.videoData.some((video) => {
      const questionCount = selectedQuestions.filter(
        (q) => q.order_id === video.order_id && q.selected
      ).length;
      return questionCount === 0;
    });

    if (hasZeroQuestions) {
      setErrors((prev) => ({
        ...prev,
        submitForm: "",
        submitNoQuestions: "",
        submitZeroQuestions: "Add Atleast one question for particular video",
      }));
      return;
    }

    dispatch(showLoader());
    const quizPayload = {
      projectId: quizData.projectId,
      moduleId: quizData.moduleId,
      videoData: quizData.videoData,
      title: quizData.title || "Untitled Quiz",
      difficulty: quizData.difficulty || "medium",
      quiz_content: selected.map(({ ...rest }) => rest),
      total_points: selected.length,
    };

    const action = modalState.isEdit
      ? updateQuizAsync({ id: modalState.editId, ...quizPayload })
      : createQuizAsync(quizPayload);

    dispatch(action)
      .unwrap()
      .then(() => {
        dispatch(fetchQuizzes());
        Notifier({
          type: "success",
          title: modalState.isEdit ? "Quiz Updated" : "Quiz Created",
          description: `The quiz has been successfully ${
            modalState.isEdit ? "updated" : "created"
          }.`,
          placement: "bottomRight",
          colors,
        });
        closeModal();
        setFormSubmitted(false);
        setSelectedQuestions([]);
      })
      .catch((err) => {
        Notifier({
          type: "error",
          title: "Quiz Operation Failed",
          description: err.message || "An error occurred.",
          placement: "bottomRight",
          colors,
        });
      })
      .finally(() => dispatch(hideLoader()));
  };

  const handleVideoDataChange = (index, field, value) => {
    dispatch(
      updateVideoData({
        index,
        data: {
          [field]: field === "numQuestions" ? parseInt(value) || 0 : value,
        },
      })
    );
    setErrors((prev) => ({
      ...prev,
      videoData:
        quizData.videoData.length === 0 ||
        quizData.videoData.some(
          (v) =>
            !v.videoId ||
            !v.numQuestions ||
            v.numQuestions <= 0 ||
            v.videoId.length !== 11
        )
          ? "At least one valid YouTube video with a positive number of questions is required."
          : "",
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    }));
  };

  const handleManualQuestionSubmit = (videoId) => {
    const trimmedText = manualQuestion.text?.trim();
    const trimmedOptions = manualQuestion.options.map((opt) => opt?.trim());
    const trimmedCorrect = manualQuestion.correct?.trim();

    if (
      !trimmedText ||
      trimmedOptions.some((opt) => !opt) ||
      !trimmedCorrect ||
      trimmedOptions.indexOf(trimmedCorrect) === -1
    ) {
      setErrors((prev) => ({
        ...prev,
        manualQuestionText: !trimmedText ? "Question text is required." : "",
        manualOptions: trimmedOptions.some((opt) => !opt)
          ? "All options must be filled."
          : "",
        manualCorrect:
          !trimmedCorrect || trimmedOptions.indexOf(trimmedCorrect) === -1
            ? "A valid correct answer is required."
            : "",
        submitForm: "",
        submitNoQuestions: "",
        submitZeroQuestions: "",
      }));
      return;
    }

    const video = quizData.videoData.find((v) => v.videoId === videoId);
    const videoQuestions = selectedQuestions.filter(
      (q) => q.order_id === video.order_id
    );
    const maxVideoQuestionId = videoQuestions.length
      ? Math.max(...videoQuestions.map((q) => q.video_question_id || 0))
      : 0;

    const newQuestion = {
      text: manualQuestion.text,
      options: manualQuestion.options,
      correct: manualQuestion.correct,
      id: selectedQuestions.length,
      selected: true,
      order_id: video.order_id,
      question_id: selectedQuestions.length + 1,
      video_question_id: maxVideoQuestionId + 1,
    };
    const updatedQuestions = [...selectedQuestions, newQuestion]
      .sort(
        (a, b) =>
          a.order_id - b.order_id || a.video_question_id - b.video_question_id
      )
      .map((q, index) => ({
        ...q,
        question_id: index + 1,
      }));
    setSelectedQuestions(updatedQuestions);
    setManualQuestion({
      videoId: null,
      text: "",
      options: ["", "", "", ""],
      correct: "",
    });
    setErrors((prev) => ({
      ...prev,
      manualQuestionText: "",
      manualOptions: "",
      manualCorrect: "",
      submitForm: "",
      submitNoQuestions: "",
      submitZeroQuestions: "",
    }));
  };

  const renderModalFooter = (isQuestionModal = false) => {
    const hasErrors = Object.values(errors).some((error) => error);
    const errorMessage =
      errors.videoData ||
      errors.submitForm ||
      errors.submitNoQuestions ||
      errors.submitZeroQuestions ||
      (hasErrors ? "Some errors in form" : "");
    return (
      <Flex className="mt-4 flex-col sm:flex-row justify-end gap-2">
        <Flex className="flex-1 items-center">
          {errorMessage && (
            <Text
              style={{
                color: "red",
                fontSize: 14,
                flex: 1,
                textAlign: "center",
              }}
            >
              {errorMessage}
            </Text>
          )}
        </Flex>
        <Flex align="center" gap={8}>
          <Button
            onClick={() => {
              setShowViewQuestionsModal(false);
              if (isQuestionModal) {
                setErrors((prev) => ({
                  ...prev,
                  submitForm: "",
                  submitNoQuestions: "",
                  submitZeroQuestions: "",
                  videoData: "",
                }));
              }
            }}
            className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
          >
            {isQuestionModal ? "Cancel" : "Go Back"}
          </Button>
          <Button
            type="primary"
            style={{ backgroundColor: colors.primary, color: colors.white }}
            onClick={handleSubmit}
            className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
          >
            Save Quiz
          </Button>
        </Flex>
      </Flex>
    );
  };

  const renderManualQuestionForm = (videoId) => (
    <Col
      className="mb-4"
      data-video-id={videoId}
    >
      <Card style={{ marginBottom: 16, padding: 16 }}>
        <Space direction="vertical" style={{ width: "100%", display: "block" }}>
          <Text style={{ fontSize: 14, display: "block", fontWeight: 600 }}>
            Question Text
          </Text>
          <Input
            placeholder="Enter question text"
            value={manualQuestion.text}
            onChange={(e) =>
              setManualQuestion({ ...manualQuestion, text: e.target.value })
            }
            style={{ width: "100%" }}
          />
          {errors.manualQuestionText && (
            <Text className="font-normal text-red-400 text-xs mt-1">
              {errors.manualQuestionText}
            </Text>
          )}
          <Text
            style={{
              fontSize: 14,
              display: "block",
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            Options
          </Text>
          {manualQuestion.options.map((option, i) => (
            <Input
              key={i}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              value={option}
              onChange={(e) => {
                const newOptions = [...manualQuestion.options];
                newOptions[i] = e.target.value;
                setManualQuestion({ ...manualQuestion, options: newOptions });
              }}
              style={{ width: "100%", marginBottom: 8 }}
            />
          ))}
          {errors.manualOptions && (
            <Text className="font-normal text-red-400 text-xs mt-1">
              {errors.manualOptions}
            </Text>
          )}
          <Text
            style={{
              fontSize: 14,
              display: "block",
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            Correct Answer
          </Text>
          <Select
            placeholder="Select correct answer"
            value={manualQuestion.correct}
            onChange={(value) =>
              setManualQuestion({ ...manualQuestion, correct: value })
            }
            style={{ width: "100%" }}
          >
            {manualQuestion.options.map((option, i) => (
              <Select.Option key={i} value={option} disabled={!option}>
                {String.fromCharCode(65 + i)}) {option || "Empty"}
              </Select.Option>
            ))}
          </Select>
          {errors.manualCorrect && (
            <Text className="font-normal text-red-400 text-xs mt-1">
              {errors.manualCorrect}
            </Text>
          )}
          <Flex className="!mt-4" justify="end" gap={8}>
            <Button
              onClick={() => {
                setManualQuestion({ ...manualQuestion, videoId: null });
                setErrors((prev) => ({
                  ...prev,
                  manualQuestionText: "",
                  manualOptions: "",
                  manualCorrect: "",
                }));
              }}
              className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              style={{ backgroundColor: colors.primary, color: colors.white }}
              onClick={() => handleManualQuestionSubmit(videoId)}
              className="w-full sm:w-auto text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
            >
              Save
            </Button>
          </Flex>
        </Space>
      </Card>
    </Col>
  );

  const renderQuestionCard = (question, index) => {
    if (editingQuestion?.id === question.id) {
      return (
        <Card
          key={question.id}
          style={{ marginBottom: 16, padding: 16 }}
          data-question-id={question.id}
        >
          <Space
            direction="vertical"
            style={{ width: "100%", display: "block" }}
          >
            <Text style={{ fontSize: 14, display: "block", fontWeight: 600 }}>
              Question Text
            </Text>
            <Input
              value={editingQuestion.text}
              onChange={(e) =>
                setEditingQuestion({ ...editingQuestion, text: e.target.value })
              }
              placeholder="Enter question text"
              style={{ width: "100%" }}
            />
            {errors.editQuestionText && (
              <Text className="font-normal text-red-400 text-xs mt-1">
                {errors.editQuestionText}
              </Text>
            )}
            <Text style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>
              Options
            </Text>
            {editingQuestion.options.map((option, i) => (
              <Input
                key={i}
                value={option}
                onChange={(e) => {
                  const newOptions = [...editingQuestion.options];
                  newOptions[i] = e.target.value;
                  setEditingQuestion({
                    ...editingQuestion,
                    options: newOptions,
                  });
                }}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                style={{ width: "100%", marginBottom: 8 }}
              />
            ))}
            {errors.editOptions && (
              <Text className="font-normal text-red-400 text-xs mt-1">
                {errors.editOptions}
              </Text>
            )}
            <Text style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>
              Correct Answer
            </Text>
            <Select
              value={editingQuestion.correct}
              onChange={(value) =>
                setEditingQuestion({ ...editingQuestion, correct: value })
              }
              style={{ width: "100%" }}
            >
              {editingQuestion.options.map((option, i) => (
                <Select.Option key={i} value={option} disabled={!option}>
                  {String.fromCharCode(65 + i)}) {option}
                </Select.Option>
              ))}
            </Select>
            {errors.editCorrect && (
              <Text className="font-normal text-red-400 text-xs mt-1">
                {errors.editCorrect}
              </Text>
            )}
            <Flex className="!mt-4" justify="end" gap={8}>
              <Button onClick={handleEditCancel}>Cancel</Button>
              <Button
                type="primary"
                style={{ backgroundColor: colors.primary, color: colors.white }}
                onClick={handleEditSave}
              >
                Save
              </Button>
            </Flex>
          </Space>
        </Card>
      );
    }

    return (
      <Card key={question.id} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space align="start" style={{ width: "100%" }}>
            <Checkbox
              checked={question.selected}
              onChange={(e) =>
                handleQuestionSelect(question.id, e.target.checked)
              }
            />
            <Text style={{ flex: 1, wordBreak: "break-word" }}>{`${
              index + 1
            }. ${question.text}`}</Text>
          </Space>
          {question.options.map((option, i) => (
            <Text
              key={i}
              style={{
                marginLeft: 32,
                wordBreak: "break-word",
                display: "block",
              }}
            >
              {`${String.fromCharCode(65 + i)}) ${option}`}
            </Text>
          ))}
          <Text
            type="success"
            style={{
              marginLeft: 32,
              wordBreak: "break-word",
              display: "block",
            }}
          >
            Correct: {question.correct}
          </Text>
          <Button
            size="small"
            onClick={() => {
              handleQuestionEdit(question);
              setTimeout(() => {
                const formElement = document.querySelector(
                  `div[data-question-id="${question.id}"]`
                );
                if (formElement) {
                  formElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }, 0);
            }}
            style={{ marginLeft: 32 }}
          >
            Edit
          </Button>
        </Space>
      </Card>
    );
  };

  const renderVideoSection = (video) => {
    const videoOption = videoOptions.find(
      (v) => extractYouTubeVideoId(v.url) === video.videoId
    );
    return (
      <Space key={video.videoId} direction="vertical" style={{ width: "100%" }}>
        <Title
          level={5}
          style={{ marginTop: 16 }}
        >
          {videoOption?.title || "Loading Video Title..."}
        </Title>
        {selectedQuestions
          .filter((q) => q.order_id === video.order_id)
          .sort((a, b) => a.video_question_id - b.video_question_id)
          .map((question, index) => renderQuestionCard(question, index))}
        {manualQuestion.videoId === video.videoId ? (
          renderManualQuestionForm(video.videoId)
        ) : addQuestionsState[video.videoId]?.isVisible ? (
          <Row
            className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-2 mb-4"
            wrap={false}
          >
            <Input
              type="number"
              placeholder="Enter number of questions"
              value={addQuestionsState[video.videoId]?.count || ""}
              onChange={(e) =>
                setAddQuestionsState((prev) => ({
                  ...prev,
                  [video.videoId]: {
                    ...prev[video.videoId],
                    count: parseInt(e.target.value) || 0,
                  },
                }))
              }
              style={{ width: "100px" }}
              className="pl-2"
              disabled={isLoading}
            />
            <Button
              type="primary"
              style={{
                backgroundColor: isLoading ? colors.background : colors.primary,
                color: colors.white,
                borderColor: isLoading ? colors.border : "transparent",
              }}
              onClick={() => handleAddMoreQuestions(video.videoId)}
              disabled={isLoading}
              className="w-full sm:w-auto min-w-[80px] sm:min-w-[100px] h-8 sm:h-8 text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
            >
              {isLoading ? (
                <Flex
                  style={{
                    transform: "scale(0.4)",
                  }}
                  align="center"
                  justify="center"
                >
                  <Loader isConstrained={true} />
                </Flex>
              ) : (
                "Generate"
              )}
            </Button>
            <Button
              onClick={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                }
                setTimeout(() => {
                  setIsLoading(false);
                  setAddQuestionsState((prev) => ({
                    ...prev,
                    [video.videoId]: { count: 0, isVisible: false },
                  }));
                }, 0);
              }}
              className="w-full sm:w-auto text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
            >
              Cancel
            </Button>
          </Row>
        ) : (
          <Flex wrap="wrap" justify="center" gap="small" className="w-full">
            <Button
              type="primary"
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
                border: "none",
                width: "150px",
              }}
              onClick={() =>
                setAddQuestionsState((prev) => ({
                  ...prev,
                  [video.videoId]: { count: 0, isVisible: true },
                }))
              }
              className="text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-10"
            >
              Generate Questions
            </Button>
            <Button
              onClick={() => {
                setManualQuestion({
                  ...manualQuestion,
                  videoId: video.videoId,
                });
                setTimeout(() => {
                  const formElement = document.querySelector(
                    `div[data-video-id="${video.videoId}"]`
                  );
                  if (formElement) {
                    formElement.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }, 0);
              }}
              style={{ width: "150px" }}
              className="text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-10"
            >
              Add Question
            </Button>
          </Flex>
        )}
      </Space>
    );
  };

  const columns = [
    {
      title: "Quiz Title",
      dataIndex: "title",
      key: "title",
      render: (text) => (
        <Space align="center" size={8}>
          <Icon
            icon="mdi:quiz"
            width="25"
            className={colors.text}
          />
          {text || "Untitled Quiz"}
        </Space>
      ),
    },
    {
      title: "Module",
      dataIndex: "module_title",
      key: "module",
      render: (text) => (
        <Space align="center" size={8}>
          <Avatar
            size={18}
            style={{ backgroundColor: colors.avtar }}
            icon={<Icon icon="mdi:book" />}
          />
          {text || "Unknown Module"}
        </Space>
      ),
    },
    {
      title: "Project",
      dataIndex: "project_id",
      key: "project_id",
      render: (projectId) => {
        const project = projectOptions.find((p) => p.id === projectId);
        return (
          <Space align="center" size={8}>
            <Avatar
              size={18}
              style={{ backgroundColor: colors.avtar }}
              icon={<Icon icon="mdi:folder" />}
            />
            {project?.project_name || "Unknown Project"}
          </Space>
        );
      },
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      key: "difficulty",
      render: (difficulty) => (
        <Flex align="center" gap={8} className="capitalize">
          <Avatar
            size={18}
            style={{ backgroundColor: colors.avtar }}
            icon={<Icon icon="mdi:chart-line" />}
          />
          {difficulty || "Not specified"}
        </Flex>
      ),
    },
    {
      title: "Questions",
      dataIndex: "total_points",
      key: "total_points",
      align: "center",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Icon
            icon="mdi:pencil"
            width="18"
            className={`cursor-pointer ${colors.darkGray}`}
            onClick={() => openModal(true, record)}
          />
          <Icon
            icon="mdi:trash-can"
            width="18"
            className="cursor-pointer text-red-400"
            onClick={() =>
              dispatch(setDeleteModal({ isOpen: true, quizId: record.id }))
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Row
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4"
          wrap
        >
          <Col className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <Input
              placeholder="Search quizzes..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full sm:w-[200px]"
            />
            <Select
              value={filters.project}
              onChange={(value) => setFilters({ ...filters, project: value })}
              placeholder="Filter by Project"
              className="w-full sm:w-[150px]"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                <Empty
                  image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                  imageStyle={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  description={
                    <Text level={4} style={{ color: colors.textcolor }}>
                      No Data
                    </Text>
                  }
                />
              }
            >
              <Select.Option value="">All Projects</Select.Option>
              {projectOptions.map((project) => (
                <Select.Option key={project.id} value={project.project_name}>
                  {project.project_name}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={filters.module}
              onChange={(value) => setFilters({ ...filters, module: value })}
              placeholder="Filter by Module"
              className="w-full sm:w-[150px]"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                <Empty
                  image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                  imageStyle={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  description={
                    <Text level={4} style={{ color: colors.textcolor }}>
                      No Data
                    </Text>
                  }
                />
              }
            >
              <Select.Option value="">All Modules</Select.Option>
              {[...new Set(quizzes.map((q) => q.module_title))]
                .filter(
                  (moduleTitle) =>
                    !filters.project ||
                    quizzes.some(
                      (q) =>
                        q.module_title === moduleTitle &&
                        projectOptions.find((p) => p.id === q.project_id)
                          ?.project_name === filters.project
                    )
                )
                .map((moduleTitle) => (
                  <Select.Option key={moduleTitle} value={moduleTitle}>
                    {moduleTitle}
                  </Select.Option>
                ))}
            </Select>
            <Select
              value={filters.difficulty}
              onChange={(value) =>
                setFilters({ ...filters, difficulty: value })
              }
              placeholder="Filter by Difficulty"
              className="w-full sm:w-[150px]"
              allowClear
            >
              <Select.Option value="">All Difficulties</Select.Option>
              {difficultyOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Button
            type="primary"
            onClick={() => openModal(false)}
            style={{ backgroundColor: colors.primary, boxShadow: "none" }}
            className="w-full sm:w-auto"
          >
            + Create Quiz
          </Button>
        </Row>

        <Card
          title={
            <Text className="flex items-center font-bold text-lg">Quizzes</Text>
          }
          className="shadow-md rounded-lg min-h-[400px] h-full w-full flex flex-col justify-start p-0 overflow-hidden"
          styles={{ body: { padding: 0 }, head: { borderBlockStyle: "none" } }}
          style={{ borderColor: colors.background }}
        >
          <Flex
            vertical
            className="flex-1 w-full overflow-auto max-h-[400px] relative"
          >
            {sortedQuizzes.length > 0 ? (
                <CustomTable
                  columns={columns}
                  dataSource={sortedQuizzes}
                  loading={false}
                />
            ) : (
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                imageStyle={{
                  height: "100px",
                  margin: "auto",
                  marginTop: "50px",
                }}
                description={
                  <Text style={{ color: colors.textcolor }}>
                    No quizzes available
                  </Text>
                }
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              />
            )}
          </Flex>
        </Card>
        <Modal
          title={
            <Text style={{ fontWeight: 500, fontSize: 17 }}>
              {modalState.isEdit ? "Edit Quiz" : "Create a New Quiz"}
            </Text>
          }
          open={modalState.isOpen && !showViewQuestionsModal}
          onCancel={closeModal}
          centered
          width={500}
          maskClosable={!isLoading}
          destroyOnClose={true}
          footer={[
            <Row
              className="mt-4 flex flex-col sm:flex-row justify-end gap-2 w-full"
              key="footer"
            >
              <Col>
              <Button
                onClick={closeModal}
                className="w-full sm:w-auto"
                style={{ width: "145px" }}
              >
                Cancel
              </Button>
              </Col>

              {!modalState.isEdit && (
                <Space className="flex gap-2">
                  <Button
                    type="primary"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.white,
                      border: "none",
                      width: "145px",
                    }}
                    onClick={handleGenerateQuestions}
                    disabled={isLoading}
                  >
                    Generate Questions
                  </Button>
                  <Button
                    type="primary"
                    style={{
                      backgroundColor: colors.primary,
                      color: colors.white,
                      border: "none",
                      width: "145px",
                    }}
                    onClick={() => {
                      const requiredValid =
                        quizData.projectId &&
                        quizData.moduleId &&
                        quizData.title?.trim() &&
                        quizData.difficulty;
                      if (!requiredValid) {
                        setErrors({
                          project: !quizData.projectId
                            ? "Project is required."
                            : "",
                          module: !quizData.moduleId
                            ? "Module is required."
                            : "",
                          title: !quizData.title?.trim()
                            ? "Quiz title is required."
                            : "",
                          difficulty: !quizData.difficulty
                            ? "Difficulty level is required."
                            : "",
                          videoData: "",
                        });
                        return;
                      }
                      if (checkDuplicateTitle(quizData.title)) {
                        setErrors((prev) => ({
                          ...prev,
                          title: "Quiz title already exists",
                        }));
                        return;
                      }
                      setShowViewQuestionsModal(true);
                      setManualQuestion({
                        ...manualQuestion,
                        videoId:
                          quizData.videoData.length > 0
                            ? quizData.videoData[0].videoId
                            : null,
                      });
                    }}
                    disabled={isLoading || quizData.videoData.length === 0}
                  >
                    Add question
                  </Button>
                </Space>
              )}
              {modalState.isEdit && (
                <Col>
                <Button
                  type="primary"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.white,
                  }}
                  onClick={() => {
                    if (!quizData.title?.trim()) {
                      setErrors((prev) => ({
                        ...prev,
                        title: "Quiz title is required.",
                      }));
                      return;
                    }
                    if (checkDuplicateTitle(quizData.title)) {
                      setErrors((prev) => ({
                        ...prev,
                        title: "Quiz title already exists",
                      }));
                      return;
                    }
                    setShowViewQuestionsModal(true);
                  }}
                >
                  See Questions
                </Button>
                </Col>
              )}
            </Row>,
          ]}
        >
          {isLoading && <Loader isConstrained={true} />}
          <Space
            direction="vertical"
            style={{ display: isLoading ? "none" : "block", width: "100%" }}
          >
            <Space
              direction="vertical"
              className="relative w-full !mb-4"
              style={{ width: "100%" }}
            >
              <Text className="font-normal !mb-2 after:content-['*'] after:text-red-400 after:ml-1">
                Project
              </Text>
              <Select
                ref={projectRef}
                className="w-full"
                value={quizData.projectId}
                onChange={(value) => {
                  updateQuizData({
                    projectId: value,
                    moduleId: null,
                    videoData: [],
                  });
                  dispatch(fetchModules(value));
                  setErrors((prev) => ({
                    ...prev,
                    project: value ? "" : "Project is required.",
                  }));
                  setSelectedQuestions([]);
                }}
                placeholder="Search or Select Project"
                showSearch
                optionFilterProp="children"
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    imageStyle={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: "50px",
                    }}
                    description={
                      <Text level={4} style={{ color: colors.textcolor }}>
                        No Data
                      </Text>
                    }
                  />
                }
                filterOption={(input, option) => {
                  const project = projectOptions.find(
                    (p) => p.id === option.value
                  );
                  return (
                    project?.project_name
                      ?.toLowerCase()
                      .includes(input.toLowerCase()) || false
                  );
                }}
                allowClear
              >
                {projectOptions.map((project) => (
                  <Select.Option
                    key={project.id}
                    value={project.id}
                  >
                    <Space align="center" size={8}>
                      <Avatar
                        size={18}
                        style={{ backgroundColor: colors.avtar }}
                        icon={<Icon icon="mdi:folder" />}
                      />
                      {project.project_name || "Unnamed Project"}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              {formSubmitted && errors.project && (
                <Text className="!font-normal text-red-400 text-xs mt-1">
                  {errors.project}
                </Text>
              )}
            </Space>

            <Space
              direction="vertical"
              className="relative w-full !mb-4"
              style={{ width: "100%" }}
            >
              <Text className="font-normal !mb-2 !mt-4 after:content-['*'] after:text-red-400 after:ml-1">
                Module
              </Text>
              <Select
                ref={moduleRef}
                className="w-full"
                value={quizData.moduleId}
                onChange={(value) => {
                  updateQuizData({ moduleId: value, videoData: [] });
                  dispatch(fetchVideos(value));
                  setErrors((prev) => ({
                    ...prev,
                    module: value ? "" : "Module is required.",
                  }));
                  setSelectedQuestions([]);
                }}
                placeholder="Search or Select Module"
                disabled={!quizData.projectId}
                showSearch
                optionFilterProp="children"
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    imageStyle={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: "50px",
                    }}
                    description={
                      <Text level={4} style={{ color: colors.textcolor }}>
                        No Data
                      </Text>
                    }
                  />
                }
                filterOption={(input, option) => {
                  const module = moduleOptions.find(
                    (m) => m.id === option.value
                  );
                  return (
                    module?.title
                      ?.toLowerCase()
                      .includes(input.toLowerCase()) || false
                  );
                }}
                allowClear
              >
                {moduleOptions.map((module) => (
                  <Select.Option
                    key={module.id}
                    value={module.id}
                  >
                    <Space align="center" size={8}>
                      <Avatar
                        size={18}
                        style={{ backgroundColor: colors.avtar }}
                        icon={<Icon icon="mdi:book" />}
                      />
                      {module.title || "Unnamed Module"}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              {formSubmitted && errors.module && (
                <Text className="text-red-400 text-xs mt-1">
                  {errors.module}
                </Text>
              )}
            </Space>

            <Space
              direction="vertical"
              className="relative w-full !mb-4"
              style={{ width: "100%" }}
            >
              <Text className="!font-normal !mb-2 !mt-4 after:content-['*'] after:text-red-400 after:ml-1">
                Videos
              </Text>
              <Select
                mode="multiple"
                className="w-full"
                style={{ minHeight: "32px" }}
                dropdownAlign={{ offset: [0, 0], points: ["tl", "bl"] }}
                getPopupContainer={(triggerNode) => triggerNode.parentNode}
                value={quizData.videoData.map((video) => ({
                  value: video.videoId,
                  label: (
                    <Space align="center" size={8}>
                      <Avatar
                        size={18}
                        style={{ backgroundColor: colors.avtar }}
                        icon={<Icon icon="mdi:video" />}
                      />
                      {videoOptions.find(
                        (v) => extractYouTubeVideoId(v.url) === video.videoId
                      )?.title || "Unnamed Video"}
                    </Space>
                  ),
                }))}
                onChange={(selectedVideos) => {
                  const newVideoData = selectedVideos.map((video, index) => {
                    const existingVideo = quizData.videoData.find(
                      (v) => v.videoId === video.value
                    );
                    return {
                      videoId: video.value,
                      numQuestions: existingVideo?.numQuestions || 0,
                      order_id: existingVideo?.order_id || index + 1,
                    };
                  });
                  updateQuizData({ videoData: newVideoData });

                  const selectedOrderIds = newVideoData.map((v) => v.order_id);
                  const restoredQuestions = quizData.quiz_content
                    .filter((q) => selectedOrderIds.includes(q.order_id))
                    .map((q, index) => {
                      const videoQuestions = quizData.quiz_content.filter(
                        (question) => question.order_id === q.order_id
                      );
                      const videoQuestionIndex = videoQuestions.findIndex(
                        (question) => question === q
                      );
                      return {
                        text: q.text,
                        correct: q.correct,
                        options: q.options,
                        order_id: q.order_id,
                        question_id: selectedQuestions.length + index + 1,
                        video_question_id: videoQuestionIndex + 1,
                        id: selectedQuestions.length + index,
                        selected: true,
                      };
                    });

                  setSelectedQuestions((prev) => {
                    const remainingQuestions = prev.filter((q) =>
                      selectedOrderIds.includes(q.order_id)
                    );
                    const allQuestions = [
                      ...remainingQuestions,
                      ...restoredQuestions.filter(
                        (rq) =>
                          !remainingQuestions.some(
                            (q) =>
                              q.order_id === rq.order_id &&
                              q.video_question_id === rq.video_question_id
                          )
                      ),
                    ]
                      .sort(
                        (a, b) =>
                          a.order_id - b.order_id ||
                          a.video_question_id - b.video_question_id
                      )
                      .map((q, index) => ({
                        ...q,
                        question_id: index + 1,
                      }));
                    return allQuestions;
                  });
                  setErrors((prev) => ({
                    ...prev,
                    videoData:
                      newVideoData.length === 0
                        ? "At least one valid YouTube video is required."
                        : "",
                  }));
                }}
                placeholder="Search or Select Videos"
                disabled={!quizData.moduleId}
                showSearch
                labelInValue
                optionFilterProp="label"
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    imageStyle={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: "50px",
                    }}
                    description={
                      <Text level={4} style={{ color: colors.textcolor }}>
                        No Data
                      </Text>
                    }
                  />
                }
                filterOption={(input, option) => {
                  const video = videoOptions.find(
                    (v) => extractYouTubeVideoId(v.url) === option.value
                  );
                  return (
                    video?.title?.toLowerCase().includes(input.toLowerCase()) ||
                    video?.url?.toLowerCase().includes(input.toLowerCase()) ||
                    false
                  );
                }}
                allowClear
              >
                {videoOptions.map((video) => (
                  <Select.Option
                    key={video.id}
                    value={extractYouTubeVideoId(video.url)}
                    label={video.title}
                  >
                    <Space align="center" size={8}>
                      <Avatar
                        size={18}
                        style={{ backgroundColor: colors.avtar }}
                        icon={<Icon icon="mdi:video" />}
                      />
                      {video.title || "Unnamed Video"}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              {formSubmitted && errors.videoData && (
                <Text className="text-red-400 text-xs mt-1">
                  {errors.videoData}
                </Text>
              )}
            </Space>

            {quizData.videoData.length > 0 && (
              <Space
                direction="vertical"
                className="mt-4 mb-4"
                style={{ width: "100%" }}
              >
                <Text className="font-normal mb-2">Selected Videos</Text>
                <Col
                  style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                    border: `1px solid ${colors.border}`,
                    borderRadius: "4px",
                    padding: "8px",
                  }}
                >
                  {quizData.videoData.map((video, index) => {
                    const videoOption = videoOptions.find(
                      (v) => extractYouTubeVideoId(v.url) === video.videoId
                    );
                    const questionCount = modalState.isEdit
                      ? quizData.quiz_content.filter(
                          (q) => q.order_id === video.order_id
                        ).length
                      : video.numQuestions;
                    return (
                      <Row
                        key={index}
                        align="middle"
                        justify="space-between"
                        className="gap-2 mb-2 p-2 rounded-md"
                        style={{
                          border: `1px solid ${colors.border}`,
                          minHeight: "48px",
                        }}
                      >
                        <Space
                          align="center"
                          size="small"
                          className="flex !max-w-[65%] items-center gap-2"
                        >
                          <Avatar
                            size={18}
                            style={{ backgroundColor: colors.avtar }}
                            icon={<Icon icon="mdi:video" />}
                          />
                          <Space
                            direction="vertical"
                            className="truncate"
                            style={{ width: "100%" }}
                          >
                            <Text
                              className="text-sm font-medium truncate"
                              title={videoOption?.title}
                            >
                              {videoOption?.title || "Loading Video Title..."}
                            </Text>
                          </Space>
                        </Space>
                        <Space align="center" size="small">
                          {modalState.isEdit ? (
                            <Text>{questionCount} Questions</Text>
                          ) : (
                            <>
                              <Input
                                type="number"
                                placeholder="Questions count"
                                value={video.numQuestions}
                                onChange={(e) =>
                                  handleVideoDataChange(
                                    index,
                                    "numQuestions",
                                    Number(e.target.value)
                                  )
                                }
                                size="small"
                                className="w-28 text-center"
                              />
                              <Button
                                type="text"
                                icon={<Icon icon="mdi:close" />}
                                onClick={() => {
                                  dispatch(
                                    updateVideoData({ index, data: null })
                                  );
                                  setSelectedQuestions((prev) =>
                                    prev.filter(
                                      (q) => q.order_id !== video.order_id
                                    )
                                  );
                                }}
                              />
                            </>
                          )}
                        </Space>
                      </Row>
                    );
                  })}
                </Col>
              </Space>
            )}
            <Space direction="vertical" className="w-full mb-4">
              <Text className="font-normal mb-2 mt-4 after:content-['*'] after:text-red-400 after:ml-1">
                Quiz Title
              </Text>
              <Input
                ref={titleRef}
                placeholder="Enter quiz title"
                value={quizData.title}
                onChange={(e) => {
                  updateQuizData({ title: e.target.value });
                  setErrors((prev) => ({ ...prev, title: "" }));
                }}
                className="w-full mb-1"
              />
              {errors.title && (
                <Text type="danger" className="font-normal text-xs mt-1">
                  {errors.title}
                </Text>
              )}
            </Space>
            <Space direction="vertical" className="w-full mb-4">
              <Text className="font-normal mb-2 after:content-['*'] after:text-red-400 after:ml-1">
                Difficulty Level
              </Text>
              <Select
                className="w-full"
                value={quizData.difficulty}
                onChange={(value) => {
                  updateQuizData({ difficulty: value });
                  setErrors((prev) => ({
                    ...prev,
                    difficulty: value ? "" : "Difficulty level is required.",
                  }));
                }}
                placeholder="Select Difficulty Level"
                showSearch
                optionFilterProp="children"
                notFoundContent={
                  <Empty
                    image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                    imageStyle={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: "50px",
                    }}
                    description={
                      <Text level={4} style={{ color: colors.textcolor }}>
                        No Data
                      </Text>
                    }
                  />
                }
                filterOption={(input, option) =>
                  option.children
                    ?.toLowerCase()
                    .includes(input.toLowerCase()) || false
                }
                allowClear
              >
                {difficultyOptions.map((difficulty) => (
                  <Select.Option
                    key={difficulty.value}
                    value={difficulty.value}
                  >
                    <Flex align="center" gap={8}>
                      {difficulty.label || "Unnamed Difficulty"}
                    </Flex>
                  </Select.Option>
                ))}
              </Select>
              {formSubmitted && errors.difficulty && (
                <Text className="font-normal text-red-400 text-xs mt-1">
                  {errors.difficulty}
                </Text>
              )}
            </Space>
          </Space>
        </Modal>
        <Modal
          title={
            <Text style={{ fontWeight: 500, fontSize: 17 }}>
              {modalState.isEdit ? "Existing Questions" : "Generated Questions"}
            </Text>
          }
          open={showViewQuestionsModal}
          onCancel={() => setShowViewQuestionsModal(false)}
          centered
          maskClosable={false}
          width={700}
          footer={[renderModalFooter(true)]}
        >
          <Flex
            vertical
            style={{
              minHeight: "200px",
              position: "relative",
              height: "100%",
            }}
          >
            {loading && !isLoading && <Loader isConstrained={true} />}
            {(!loading || isLoading) && (
              <Affix offsetTop={10}>
                <Card
                  styles={{
                    body: {
                      overflowY: "auto",
                      maxHeight: "calc(100vh - 350px)",
                      width: "100%",
                      padding: 0,
                    },
                  }}
                  bordered={false}
                >
                  {quizData.videoData.map((video) => renderVideoSection(video))}
                  {selectedQuestions.length === 0 && (
                    <Text style={{ color: colors.textcolor }}>
                      No questions available.
                    </Text>
                  )}
                </Card>
              </Affix>
            )}
          </Flex>
        </Modal>
        <ConfirmDeleteModal
          visible={deleteModal.isOpen}
          onConfirm={() => {
            dispatch(deleteQuizAsync(deleteModal.quizId))
              .unwrap()
              .then(() => {
                dispatch(fetchQuizzes());
                Notifier({
                  type: "success",
                  title: "Quiz Deleted",
                  description: "The quiz has been successfully deleted.",
                  placement: "bottomRight",
                  colors,
                });
              })
              .catch(() => {
                Notifier({
                  type: "error",
                  title: "Deletion Failed",
                  description: "Failed to delete the quiz. Please try again.",
                  placement: "bottomRight",
                  colors,
                });
              });
          }}
          onCancel={() =>
            dispatch(setDeleteModal({ isOpen: false, quizId: null }))
          }
          title="Confirm Deletion"
          description="Are you sure you want to delete this quiz?"
        />
      </Space>
    </ConfigProvider>
  );
};

export default QuizGenerator;
