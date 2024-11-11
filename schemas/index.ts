// Types for our data structuresexport
export type Project = {
  id: number;
  title: string;
  description: string;
  programLead: string;
};

export type TaskStatus = "Upcoming" | "In Progress" | "Done";

export type Task = {
  id: number;
  title: string;
  description?: string;
  programLead: string;
  jiraLink: string;
  dueDate: string;
  dateCreated: string;
  dateModified: string;
  status: TaskStatus;
};

export type Note = {
  id: number;
  taskId: number;
  text: string;
  dateCreated: string;
  dateModified: string;
};
