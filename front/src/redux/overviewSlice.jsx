import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  summary: {
    description: "Give a high-level overview of the product / project you’re working on, its goals, etc.",
    startDate: "3 Oct, 2023",
    estimateTime: 12,
    Team : "Alpha",
  },
  progress: 60,
  columns: [
    {
      title: "Member",
      dataIndex: "member",
      render: (member) => (
        <div className="flex items-center gap-2">
          <Avatar src={member.avatar} />
          <span>{member.name}</span>
        </div>
      ),
    },
    {
      title: "Workload",
      dataIndex: "workload",
      render: (text) => <span>{text}%</span>,
    },
  ],
  dataSource: [
    {
      key: 1,
      member: {
        name: "Eleanor Pena",
        avatar: "https://randomuser.me/api/portraits/women/22.jpg",
      },
      task: "Design a Dash UI Figma",
      deadline: "30 Aug, 2023",
      workload: 62,
    },
    {
      key: 2,
      member: {
        name: "Marvin McKinney",
        avatar: "https://randomuser.me/api/portraits/men/46.jpg",
      },
      task: "Dash UI Webpack Workflow",
      deadline: "24 Sept, 2023",
      workload: 45,
    },
    {
      key: 3,
      member: {
        name: "Wade Warren",
        avatar: "https://randomuser.me/api/portraits/men/12.jpg",
      },
      task: "Dash UI React version",
      deadline: "30 Sept, 2023",
      workload: 80,
    },
    {
      key: 4,
      member: {
        name: "Courtney Henry",
        avatar: "https://randomuser.me/api/portraits/women/33.jpg",
      },
      task: "Dash UI Documents Improve",
      deadline: "20 Dec, 2023",
      workload: 90,
    },
    {
      key: 5,
      member: {
        name: "Brooklyn Simmons",
        avatar: "https://randomuser.me/api/portraits/women/55.jpg",
      },
      task: "Ecommerce Design Dash UI",
      deadline: "25 Jan, 2023",
      workload: 8,
    },
  ],
  techStackData: [
    {
      key: 1,
      name: "React",
      version: "17.0.2",
      description:
        "A JavaScript library for building user interfaces, developed by Facebook.",
    },
    {
      key: 4,
      name: "Express.js",
      version: "4.17.1",
      description:
        "A fast, unopinionated web framework for Node.js, used for building web apps and APIs.",
    },
    {
      key: 3,
      name: "Postgree",
      version: "4.4",
      description:
        "A NoSQL database used for handling large sets of unstructured data.",
    },
  ],
  projectDetails: [
    { label: "Start Date", value: "3 Jan, 2025" },
    { label: "Estimate Time", value: "180 Days" },
    { label: "Completion", value: "1 Oct, 2025" },
    { label: "Team", value: "Alpha" },
  ]
};

const overviewSlice = createSlice({
  name: "overview",
  initialState,
  reducers: {}
});

export default overviewSlice.reducer;
