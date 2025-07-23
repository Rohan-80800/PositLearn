import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Card,
  Button,
  Radio,
  Typography,
  Space,
  Progress,
  ConfigProvider,
  Flex,
} from "antd";
import { Colors } from "../config/color";
import { useUser } from "@clerk/clerk-react";

import "../App.css";
import {
  startQuiz,
  setQuizAnswer,
  setQuizQuestionIndex,
  submitQuiz,
  retakeQuiz,
  fetchQuizProgress,
  checkQuizEligibility
} from "../redux/quizUiSlice";
import { setSelectedKey, updateItems } from "../redux/videoSlice";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const QuizPlayer = ({ quizId }) => {
  const colors = Colors();
  const dispatch = useDispatch();
  const { user } = useUser();
  const userId = user?.id;

  const { items } = useSelector((state) => state.video);
  const { quizProgress, currentQuizState, eligibility } = useSelector(
    (state) => state.quizUi
  );

  const [viewResults, setViewResults] = useState(false);
  const themeConfig = {
    token: {
      motion: false,
    },
  };

  const quiz = items
    .flatMap((module) => module.quizzes)
    .find((q) => q.quizId === quizId);

  useEffect(() => {
    if (userId && quizId) {
      dispatch(fetchQuizProgress({ clerkId: userId, quizId }));
      dispatch(checkQuizEligibility({ clerkId: userId, quizId }));
    }
  }, [dispatch, userId, quizId, items]);

  if (!quiz) return <Text>Quiz not found</Text>;

  const quizProgressSafe = quizProgress || {};
  const quizProgressData = quizProgressSafe[userId]
    ? quizProgressSafe[userId][quizId]
    : null;
  const isEligible = eligibility?.[quizId]?.eligible !== false;

  if (!isEligible) {
    return (
      <Card
        title={<Space>{quiz.label}</Space>}
        style={{
          borderColor: colors.border,
          backgroundColor: colors.background
        }}
        className="!m-[10px] rounded-[12px]"
      >
        <Flex className="items-center justify-center p-6 space-y-6">
          <Flex
            className="sm:flex-row justify-around items-center w-full gap-6 min-h-[200px]"
            vertical
          >
            <Text
              style={{
                color: colors.textcolor,
                fontSize: "1rem",
                textAlign: "center"
              }}
            >
              Please complete required videos in the module before attempting
              the quiz.
            </Text>
          </Flex>
        </Flex>
      </Card>
    );
  }

  const isQuizStarted =
    !!currentQuizState && currentQuizState.quizId === quizId;
  const currentQuestionIndex = currentQuizState?.currentQuestionIndex || 0;
  const answers = currentQuizState?.answers || [];

  const handleStartQuiz = () => {
    dispatch(startQuiz({ quizId, clerkId: userId }));
  };

  const handleAnswerChange = (e) => {
    dispatch(
      setQuizAnswer({
        questionIndex: currentQuestionIndex,
        answer: e.target.value,
      })
    );
  };

  const handleNext = () => {
    dispatch(setQuizQuestionIndex(currentQuestionIndex + 1));
  };

  const handlePrevious = () => {
    dispatch(setQuizQuestionIndex(currentQuestionIndex - 1));
  };

  const handleSubmit = () => {
    dispatch(submitQuiz({ clerkId: userId, quizId, answers })).then(
      (action) => {
        if (action.payload?.status === "PASSED") {
          const parentModule = items.find((module) =>
            module.children.some((item) => item.quizId === quizId)
          );

          if (parentModule) {
            const index = parentModule.children.findIndex(
              (item) => item.quizId === quizId
            );

            if (index !== -1 && index < parentModule.children.length - 1) {
              const nextItem = parentModule.children[index + 1];
              const updatedItems = items.map((module) => {
                if (module.moduleId === parentModule.moduleId) {
                  return {
                    ...module,
                    children: module.children.map((child) => ({
                      ...child,
                      selected: child.key === nextItem.key 
                    }))
                  };
                }
                return module;
              });

              setTimeout(() => {
                dispatch(updateItems(updatedItems));
                dispatch(setSelectedKey(nextItem.key));
              }, 5000);
            }
          }
        }
        dispatch(updateItems([...items]));
      }
    );
  };

  const handleRetake = () => {
    dispatch(retakeQuiz({ quizId, clerkId: userId }));
    setViewResults(false);
  };

  const handleViewResults = () => {
    setViewResults(true);
  };

  const handleCopy = (e) => {
    e.preventDefault();
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  const renderQuizCard = () => (
    <Card
      title={
        <Space>
          {quiz.label}
          {quizProgressData?.maxScore === 100 && (
            <CheckCircleOutlined style={{ color: "limegreen" }} />
          )}
        </Space>
      }
      style={{ borderColor: colors.background, margin: "10px" }}
    >
      <Flex className="!items-center !justify-center !p-10" vertical>
        <Text>
          <Text className="mr-3">Quiz</Text> |
          <Text className="ml-4">{quiz.quizContent.length} questions</Text>
        </Text>
        <Text>Total Points: 100</Text>
        <Flex style={{ marginTop: "20px" }}>
          <Button type="primary" onClick={handleStartQuiz}>
            Start Quiz
          </Button>
        </Flex>
      </Flex>
    </Card>
  );

  const renderQuestion = () => {
    const question = quiz.quizContent[currentQuestionIndex];

    return (
      <ConfigProvider theme={themeConfig}>
        <Card
          title={
            <Text style={{ color: colors.textcolor }}>
              {`${quiz.label} - Question ${currentQuestionIndex + 1}`}
            </Text>
          }
          className="no-select !m-[10px] rounded-[12px] shadow-none"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.background,
          }}
          onCopy={handleCopy}
          onContextMenu={handleContextMenu}
        >
          <Title
            level={5}
            style={{ color: colors.textcolor, marginBottom: "20px" }}
            onCopy={handleCopy}
            onContextMenu={handleContextMenu}
          >
            Q. {question.text}
          </Title>

          <Radio.Group
            onChange={handleAnswerChange}
            value={answers[currentQuestionIndex]}
            className="!pl-3 !mt-2 w-full"
          >
            <Space direction="vertical" className="w-full">
              {question.options.map((option, index) => (
                <Radio
                  key={index}
                  value={option}
                  className="hover:bg-opacity-80 hover:shadow-sm !px-[16px] !py-[5px] rounded-[8px] w-full"
                  style={{
                    backgroundColor: colors.background,
                    color: colors.textcolor,
                  }}
                >
                  {option}
                </Radio>
              ))}
            </Space>
          </Radio.Group>

          <Flex
            className="justify-between items-center border-t pt-4 mt-10"
            style={{
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textcolor }}>
              Question {currentQuestionIndex + 1} of {quiz.quizContent.length}
            </Text>
            <Flex className="!gap-3">
              {currentQuestionIndex > 0 && (
                <Button
                  onClick={handlePrevious}
                  className="bg-transparent !border"
                  style={{
                    color: colors.textcolor,
                    border: colors.border,
                  }}
                >
                  Previous
                </Button>
              )}

              {currentQuestionIndex < quiz.quizContent.length - 1 ? (
                <Button
                  type="primary"
                  onClick={handleNext}
                  disabled={!answers[currentQuestionIndex]}
                  style={{
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    opacity: answers[currentQuestionIndex] ? 1 : 0.6,
                    cursor: answers[currentQuestionIndex]
                      ? "pointer"
                      : "not-allowed",
                    fontWeight: "bold",
                    color: answers[currentQuestionIndex] ? "#ffffff" : "#d9d9d9"
                  }}
                  className={`${
                    answers[currentQuestionIndex]
                      ? "cursor-pointer"
                      : "cursor-not-allowed"
                  }`}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  disabled={!answers[currentQuestionIndex]}
                  style={{
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    color: answers[currentQuestionIndex]
                      ? "#ffffff"
                      : "#d9d9d9",
                    fontWeight: "bold"
                  }}
                  className={`${
                    answers[currentQuestionIndex]
                      ? "cursor-pointer"
                      : "cursor-not-allowed"
                  }`}
                >
                  Submit
                </Button>
              )}
            </Flex>
          </Flex>
        </Card>
      </ConfigProvider>
    );
  };

  const renderResults = () => {
    const { maxScore, score, totalPoints, status, attempts } =
      quizProgressData;
    const percentage = score;

    if (viewResults) {
      return (
        <Card
          title={`${quiz.label} - Detailed Results`}
          className="!m-[10px] max-h-[600px]"
          style={{
            borderColor: colors.background,
          }}
        >
          <Flex className="items-center justify-center" vertical>
            <Flex className="!mt-0 w-full overflow-y-auto max-h-[450px]" vertical>
              {quiz.quizContent.map((question, index) => {
                const selectedAnswer = quizProgressData.answers[index];
                const correctAnswer = question.correct;
                const isCorrect = selectedAnswer === correctAnswer;

                return (
                  <Card
                    key={index}
                    bodyStyle={{
                      padding: "0px",
                      paddingBottom: "15px",
                      paddingTop: "20px",
                    }}
                    onCopy={handleCopy}
                    onContextMenu={handleContextMenu}
                    className="no-select !border-b !rounded-none !border-gray-300"
                    style={{ borderColor: colors.border, boxShadow: "none" }}
                  >
                    <Text
                      strong
                      style={{
                        color: colors.textcolor,
                      }}
                      className="block !mb-[12px] whitespace-normal break-words"
                    >
                      {`${index + 1}. ${question.text}`}
                    </Text>
                    <Space direction="vertical" style={{ width: "100%" }}>
                      {question.options.map((option, optIndex) => (
                        <Text
                          key={optIndex}
                          style={{
                            color:
                              option === correctAnswer
                                ? "lime"
                                : option === selectedAnswer && !isCorrect
                                ? "red"
                                : colors.textcolor,
                          }}
                          className="px-[8px] block"
                        >
                          {String.fromCharCode(65 + optIndex)}) {option}
                        </Text>
                      ))}

                      <Space align="center" style={{ marginTop: "10px" }}>
                        <Text strong>Selected option:</Text>
                        <Text style={{ color: isCorrect ? "lime" : "red" }}>
                          {isCorrect ? "Correct" : "Wrong"}
                        </Text>
                        {isCorrect ? (
                          <CheckCircleOutlined
                            style={{
                              color: "lime",
                              fontSize: "10px",
                              marginTop: "-2px"
                            }}
                          />
                        ) : (
                          <CloseCircleOutlined
                            style={{
                              color: "red",
                              fontSize: "10px",
                              marginTop: "-2px"
                            }}
                          />
                        )}
                      </Space>
                    </Space>
                  </Card>
                );
              })}
              <Button
                type="primary"
                onClick={() => setViewResults(false)}
                className="!mt-[10px]"
              >
                Back to Summary
              </Button>
            </Flex>
          </Flex>
        </Card>
      );
    }

    return (
      <Card
        title={
          <Space>
            {`${quiz.label} - Results`}
            {quizProgressData?.maxScore === 100 && (
              <CheckCircleOutlined style={{ color: "limegreen" }} />
            )}
          </Space>
        }
        style={{
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}
        className="!m-[10px] rounded-[12px]"
      >
        <Flex className="items-center justify-center p-6 space-y-6" vertical>
          <Flex className="flex-col sm:flex-row justify-around items-center w-full gap-6">
            <Flex className="items-center" vertical>
              <Progress
                type="circle"
                percent={percentage}
                strokeColor={status === "PASSED" ? "limegreen" : "orangered"}
                format={(percent) => `${percent}%`}
                width={100}
              />
              <Text style={{ marginTop: "10px", color: colors.textcolor }}>
                Latest Score: {score} / {totalPoints}
              </Text>
              <Text style={{ color: colors.textcolor }}>
                Max Score: {maxScore} / {totalPoints}
              </Text>
            </Flex>

            <Flex justify="center" className="text-center" vertical>
              <Text style={{ fontSize: "16px", color: colors.textcolor }}>
                Attempts :{" "}
              </Text>
              <Text style={{ fontSize: "1rem", color: colors.textcolor }}>
                {attempts}
              </Text>
            </Flex>

            <Flex ustify="center" className="text-center" vertical>
              <Text style={{ fontSize: "16px", color: colors.textcolor }}>
                Status :{" "}
              </Text>
              <Text
                style={{
                  color: status === "PASSED" ? "limegreen" : "orangered",
                }}
                className="!text-[1rem] font-bold"
              >
                {status}
              </Text>
            </Flex>
          </Flex>

          <Flex className="justify-center gap-4 mt-6">
            <Button
              type="primary"
              onClick={handleRetake}
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                color: colors.white,
              }}
              className="text-white px-[16px] py-[6px] !font-bold"
              disabled={quizProgressData?.maxScore === 100}
            >
              Retake Quiz
            </Button>
            <Button
              type="default"
              onClick={handleViewResults}
              style={{
                borderColor: colors.primary,
                color: colors.primary,
              }}
              className="px-[16px] py-[6px] !font-bold !transition-none"
            >
              View Results
            </Button>
          </Flex>
        </Flex>
      </Card>
    );
  };

  if (!userId) {
    return <Text>Please log in to access the quiz.</Text>;
  }

  if (isQuizStarted) {
    return renderQuestion();
  } else if (quizProgressData && quizProgressData.attempts >= 1) {
    return renderResults();
  } else {
    return renderQuizCard();
  }
};

export default QuizPlayer;
