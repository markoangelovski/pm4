// Types for our data structuresexport
export type Project = {
  id: string;
  title: string;
  description: string;
  programLead: string;
};

export type TaskStatus = "Upcoming" | "In Progress" | "Done";

export type Task = {
  id: string;
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
  id: string;
  taskId: string;
  text: string;
  dateCreated: string;
  dateModified: string;
};

export type Log = {
  id: string;
  title: string;
  duration: number;
};

export type Event = {
  id: string;
  title: string;
  creationDate: Date;
  taskTitle?: string;
  taskId?: string;
  duration: number;
  logs: Log[];
  totalBooked: number;
};
