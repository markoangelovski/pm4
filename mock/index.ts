import { Note, Project, Task } from "@/schemas";

// Mock data for demonstration
export const mockProject: Project = {
  id: 1,
  title: "Website Redesign",
  description: "Overhaul the company website with a modern, responsive design",
  programLead: "John Doe"
};

export const mockTasks: Task[] = [
  {
    id: 1,
    title: "Design Homepage",
    description: "Create a new design for the homepage",
    programLead: "Jane Smith",
    jiraLink: "https://jira.company.com/browse/WR-1",
    dueDate: "2023-07-15",
    dateCreated: "2023-06-15",
    dateModified: "2023-06-20",
    status: "In Progress"
  },
  {
    id: 2,
    title: "Implement Responsive Layout",
    description: "Ensure the website works well on all device sizes",
    programLead: "Bob Johnson",
    jiraLink: "https://jira.company.com/browse/WR-2",
    dueDate: "2023-07-30",
    dateCreated: "2023-06-16",
    dateModified: "2023-06-18",
    status: "Upcoming"
  },
  {
    id: 3,
    title: "Optimize Images",
    description: "Compress and optimize all images for faster loading",
    programLead: "Alice Williams",
    jiraLink: "https://jira.company.com/browse/WR-3",
    dueDate: "2023-07-10",
    dateCreated: "2023-06-17",
    dateModified: "2023-06-19",
    status: "Done"
  }
];

export const mockNotes: Note[] = [
  {
    id: 1,
    taskId: 1,
    text: "Initial design concepts approved",
    dateCreated: "2023-06-16",
    dateModified: "2023-06-16"
  },
  {
    id: 2,
    taskId: 1,
    text: "Revisions requested for color scheme",
    dateCreated: "2023-06-18",
    dateModified: "2023-06-18"
  },
  {
    id: 3,
    taskId: 2,
    text: "Mobile-first approach agreed upon",
    dateCreated: "2023-06-17",
    dateModified: "2023-06-17"
  },
  {
    id: 4,
    taskId: 3,
    text: "Identified tools for image optimization",
    dateCreated: "2023-06-18",
    dateModified: "2023-06-18"
  }
];
