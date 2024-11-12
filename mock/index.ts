import { Event, Note, Project, Task } from "@/types";
// Mock data for demonstration
export const mockProject: Project = {
  id: "4f3c987a-4b6e-4c8b-975a-7fbd56d69d13",
  title: "Website Redesign",
  description: "Overhaul the company website with a modern, responsive design",
  programLead: "John Doe"
};

export const mockTasks: Task[] = [
  {
    id: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
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
    id: "d0294d1a-9374-4a6a-83a5-f3333ae539dd",
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
    id: "3fc9cfeb-2c92-442a-8003-10e5f4bf0469",
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
    id: "b8de572e-4515-4ba3-b3cd-47b7a9e3c8c7",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    text: "Initial design concepts approved",
    dateCreated: "2023-06-16",
    dateModified: "2023-06-16"
  },
  {
    id: "5cb7c8ae-4ef5-41cb-a8b6-28c8f6275f54",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    text: "Revisions requested for color scheme",
    dateCreated: "2023-06-18",
    dateModified: "2023-06-18"
  },
  {
    id: "6d72e9b0-f9ad-4f36-8d8d-5fa10d3b92c1",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    text: "Mobile-first approach agreed upon",
    dateCreated: "2023-06-17",
    dateModified: "2023-06-17"
  },
  {
    id: "2f36ecff-d937-4823-8c1d-49a59d6de0e5",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    text: "Identified tools for image optimization",
    dateCreated: "2023-06-18",
    dateModified: "2023-06-18"
  }
];

export const mockEvents: Event[] = [
  {
    id: "9f8f02d2-e6f3-4f27-bb42-9a1d67f5e7c8",
    title: "Project Kickoff",
    creationDate: new Date("2023-06-01"),
    taskTitle: "Planning",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    duration: 120,
    logs: [
      {
        id: "4d41703f-2e4c-42f6-8df5-bb0b346c9349",
        title: "Meeting preparation",
        duration: 30
      },
      {
        id: "80e6f3a7-3b16-42d7-b53b-6c1381be3f7b",
        title: "Team discussion",
        duration: 60
      },
      {
        id: "36fd3539-e342-4f22-8b5e-bb529b6c36b2",
        title: "Documentation",
        duration: 30
      }
    ],
    totalBooked: 90
  },
  {
    id: "6821e7d6-632b-45b1-bdf5-22c3b93b51a3",
    title: "Client Presentation",
    creationDate: new Date("2023-06-02"),
    taskTitle: "Client Communication",
    taskId: "a9e0b2dc-8baf-4a69-aaff-b1c78a542d15",
    duration: 90,
    logs: [
      {
        id: "44f29af9-f1de-4d2b-bfa5-f6f53322fa8b",
        title: "Slide creation",
        duration: 45
      },
      {
        id: "4f2c3e38-c9ad-4abf-9c8c-9082b57e46b4",
        title: "Rehearsal",
        duration: 30
      },
      {
        id: "8b54e365-6c3d-41ab-8de6-3650c7b75e6d",
        title: "Actual presentation",
        duration: 15
      }
    ],
    totalBooked: 60
  }
];
