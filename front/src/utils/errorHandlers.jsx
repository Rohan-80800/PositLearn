export const handleApiError = (error, rejectWithValue) => {
  const status = error.response?.status;
  if (status === 401) {
    return rejectWithValue({
      status,
      title: "Authentication Error ",
      message: "Unauthorized: Please log in to perform this action.",
    });
  }
  if (status === 403) {
    return rejectWithValue({
      status,
      title: "Permission Denied ",
      message: "You do not have permission to perform this action.",
    });
  }
  return rejectWithValue({
    status: status || null,
    title: "Error",
    message: error.message || "An unexpected error occurred.",
  });
};
