export const SAMPLE_TICKET = {
  "TKT-0024": {
    id: "TKT-0024",
    subject: "Cannot access LMS portal",
    category: "IT Support",
    priority: "High",
    status: "Open",
    date: "Feb 19, 2025",
    name: "Juan Dela Cruz",
    studentId: "2021-00123",
    description: "I cannot log into the LMS portal since yesterday. It keeps saying 'Invalid credentials' even though I reset my password already.",
    updates: [
      { time: "Feb 19 · 9:00 AM", who: "System", msg: "Ticket submitted successfully." },
      { time: "Feb 19 · 10:30 AM", who: "IT Support – Admin Reyes", msg: "We are looking into the issue. Please wait for updates." },
      { time: "Feb 20 · 8:00 AM", who: "IT Support – Admin Reyes", msg: "We have escalated this to the LMS team. ETA: 24 hours." },
    ],
  },
  "TKT-0020": {
    id: "TKT-0020",
    subject: "Scholarship application query",
    category: "Finance",
    priority: "Medium",
    status: "Resolved",
    date: "Feb 10, 2025",
    name: "Juan Dela Cruz",
    studentId: "2021-00123",
    description: "I want to know the status of my scholarship application for the second semester.",
    updates: [
      { time: "Feb 10 · 2:00 PM", who: "System", msg: "Ticket submitted successfully." },
      { time: "Feb 11 · 9:00 AM", who: "Finance – Ms. Santos", msg: "Your application is under review." },
      { time: "Feb 12 · 11:00 AM", who: "Finance – Ms. Santos", msg: "Your scholarship has been approved! Check your student portal for details." },
    ],
  },
};

export const statusStyle = {
  Open:     "bg-blue-100 text-blue-700",
  Pending:  "bg-amber-100 text-amber-700",
  Resolved: "bg-green-100 text-green-700",
};

export const priorityStyle = {
  High:   "bg-red-100 text-red-600",
  Medium: "bg-amber-100 text-amber-600",
  Low:    "bg-gray-100 text-gray-500",
};
