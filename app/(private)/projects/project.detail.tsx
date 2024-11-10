"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ExternalLink,
  Search,
  ChevronDown,
  PlusCircle,
  CheckCircle,
  Edit,
  Trash2,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  ArrowLeft,
  CalendarIcon
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  formatDistanceToNow,
  isFuture,
  isPast,
  parseISO
} from "date-fns";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import NextLink from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Types for our data structures
type Project = {
  id: number;
  title: string;
  description: string;
  programLead: string;
};

type TaskStatus = "Upcoming" | "In Progress" | "Done";

type Task = {
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

type Note = {
  id: number;
  taskId: number;
  text: string;
  dateCreated: string;
  dateModified: string;
};

// Mock data for demonstration
const mockProject: Project = {
  id: 1,
  title: "Website Redesign",
  description: "Overhaul the company website with a modern, responsive design",
  programLead: "John Doe"
};

const mockTasks: Task[] = [
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

const mockNotes: Note[] = [
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

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().optional(),
  programLead: z.string().min(1, "Program lead is required")
});

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  programLead: z.string().min(1, "Program lead is required"),
  jiraLink: z.string().url("Invalid Jira link"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["Upcoming", "In Progress", "Done"])
});

const noteSchema = z.object({
  text: z.string().min(1, "Note text is required")
});

type ProjectFormData = z.infer<typeof projectSchema>;
type TaskFormData = z.infer<typeof taskSchema>;
type NoteFormData = z.infer<typeof noteSchema>;

export default function ProjectDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<Project>(mockProject);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [notes, setNotes] = useState<Note[]>(mockNotes);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(mockTasks);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [isMarkCompletedOpen, setIsMarkCompletedOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newNoteTaskId, setNewNoteTaskId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState<number | null>(null);

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
  });

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      programLead: "",
      jiraLink: "",
      dueDate: "",
      status: "Upcoming"
    }
  });

  const noteForm = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      text: ""
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false
      })
    ],
    content: ""
  });

  useEffect(() => {
    const status = searchParams.get("status");
    const searchQuery = searchParams.get("q") || "";
    const sortBy = searchParams.get("sort") || "";

    filterAndSortTasks(status, searchQuery, sortBy);
  }, [searchParams, tasks]);

  const filterAndSortTasks = (
    status: string | null,
    searchQuery: string,
    sortBy: string
  ) => {
    const filtered = tasks.filter(
      (task) =>
        (!status || status.split(",").includes(task.status)) &&
        (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.programLead.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    switch (sortBy) {
      case "name":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "due-date":
        filtered.sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        break;
      case "status":
        filtered.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "pl":
        filtered.sort((a, b) => a.programLead.localeCompare(b.programLead));
        break;
    }

    setFilteredTasks(filtered);
  };

  const updateQueryParams = (params: Record<string, string | boolean>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === false || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.push(`?${newParams.toString()}`);
  };

  const handleStatusToggle = (status: TaskStatus) => {
    const currentStatus = searchParams.get("status");
    let newStatus: string[];

    if (currentStatus) {
      newStatus = currentStatus.split(",");
      const index = newStatus.indexOf(status);
      if (index > -1) {
        newStatus.splice(index, 1);
      } else {
        newStatus.push(status);
      }
    } else {
      newStatus = [status];
    }

    if (newStatus.length > 0) {
      updateQueryParams({ status: newStatus.join(",") });
    } else {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("status");
      router.push(`?${newParams.toString()}`);
    }
  };

  const handleSearch = (query: string) => {
    updateQueryParams({ q: query });
  };

  const handleSort = (sortType: string) => {
    updateQueryParams({ sort: sortType });
  };

  const handleEditProject = (data: ProjectFormData) => {
    setProject({ ...project, ...data });
    setIsEditProjectOpen(false);
  };

  const handleDeleteProject = () => {
    // In a real application, you would delete the project here
    alert("Project deleted");
    setIsDeleteProjectOpen(false);
  };

  const handleNewTask = (data: TaskFormData) => {
    const newTask: Task = {
      ...data,
      id: tasks.length + 1,
      dateCreated: new Date().toISOString().split("T")[0],
      dateModified: new Date().toISOString().split("T")[0]
    };
    setTasks([...tasks, newTask]);
    setIsNewTaskOpen(false);
    taskForm.reset();
  };

  const handleEditTask = (data: TaskFormData) => {
    if (selectedTask) {
      const updatedTask: Task = {
        ...selectedTask,
        ...data,
        dateModified: new Date().toISOString().split("T")[0]
      };
      setTasks(
        tasks.map((task) => (task.id === selectedTask.id ? updatedTask : task))
      );
      setIsEditTaskOpen(false);
      setSelectedTask(null);
    }
  };

  const handleDeleteTask = () => {
    if (selectedTask) {
      setTasks(tasks.filter((task) => task.id !== selectedTask.id));
      setNotes(notes.filter((note) => note.taskId !== selectedTask.id));
      setIsDeleteTaskOpen(false);
      setSelectedTask(null);
    }
  };

  const handleMarkCompleted = () => {
    if (selectedTask) {
      const updatedTask: Task = {
        ...selectedTask,
        status: "Done",
        dateModified: new Date().toISOString().split("T")[0]
      };
      setTasks(
        tasks.map((task) => (task.id === selectedTask.id ? updatedTask : task))
      );
      setIsMarkCompletedOpen(false);
      setSelectedTask(null);
    }
  };

  const handleNewNote = (data: NoteFormData) => {
    if (newNoteTaskId) {
      const newNote: Note = {
        id: notes.length + 1,
        taskId: newNoteTaskId,
        text: data.text,
        dateCreated: new Date().toISOString().split("T")[0],
        dateModified: new Date().toISOString().split("T")[0]
      };
      setNotes([...notes, newNote]);
      setNewNoteTaskId(null);
      noteForm.reset();
      editor?.commands.setContent("");
    }
  };

  const handleEditNote = (data: NoteFormData) => {
    if (editingNoteId) {
      const updatedNotes = notes.map((note) =>
        note.id === editingNoteId
          ? {
              ...note,
              text: data.text,
              dateModified: new Date().toISOString().split("T")[0]
            }
          : note
      );
      setNotes(updatedNotes);
      setEditingNoteId(null);
      noteForm.reset();
      editor?.commands.setContent("");
    }
  };

  const handleDeleteNote = () => {
    if (isDeletingNoteId) {
      setNotes(notes.filter((note) => note.id !== isDeletingNoteId));
      setIsDeletingNoteId(null);
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = parseISO(dueDate);
    const now = new Date();
    const distanceToNow = formatDistanceToNow(date, { addSuffix: true });

    if (distanceToNow === "in 1 day") return "Tomorrow";
    if (distanceToNow === "1 day ago") return "Yesterday";

    return distanceToNow;
  };

  const getDateColor = (dueDate: string) => {
    const date = parseISO(dueDate);
    const now = new Date();
    const diffInDays = Math.floor(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (isPast(date)) return "bg-red-500";
    if (diffInDays <= 2) return "bg-orange-500";
    if (diffInDays <= 7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const openExternalLink = (url: string) => {
    window.open(url, "ExternalLink", "width=1280,height=720");
  };

  const getLatestNote = (taskId: number) => {
    const taskNotes = notes.filter((note) => note.taskId === taskId);
    return taskNotes.sort(
      (a, b) =>
        new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime()
    )[0];
  };

  const getTaskCounts = () => {
    const counts = {
      Upcoming: 0,
      "In Progress": 0,
      Done: 0
    };
    tasks.forEach((task) => {
      counts[task.status]++;
    });
    return counts;
  };

  const taskCounts = getTaskCounts();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>Project Details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Description:</strong> {project.description}
            </p>
            <p>
              <strong>Program Lead:</strong> {project.programLead}
            </p>
            <div className="mt-2">
              <p>
                <strong>Task Counts:</strong>
              </p>
              <ul className="list-disc list-inside">
                <li>Upcoming: {taskCounts.Upcoming}</li>
                <li>In Progress: {taskCounts["In Progress"]}</li>
                <li>Done: {taskCounts.Done}</li>
              </ul>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button onClick={() => setIsEditProjectOpen(true)}>
                Edit Project
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteProjectOpen(true)}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            All tasks associated with this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
            <div className="w-full md:w-1/2 flex items-center">
              <div className="flex items-center border border-gray-200 px-2 py-1 rounded-md w-full">
                <Search className="text-gray-400" />
                <Input
                  type="text"
                  placeholder="Find task"
                  className="w-full border-none"
                  value={searchParams.get("q") || ""}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Sort <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => handleSort("name")}>
                    By Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSort("due-date")}>
                    By Due Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSort("status")}>
                    By Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleSort("pl")}>
                    By Program Lead
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
                <DialogTrigger asChild>
                  <Button>New Task</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <Form {...taskForm}>
                    <form
                      onSubmit={taskForm.handleSubmit(handleNewTask)}
                      className="space-y-4"
                    >
                      <FormField
                        control={taskForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="programLead"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Program Lead</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="jiraLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Jira Link</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-[240px] pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={
                                    field.value
                                      ? new Date(field.value)
                                      : undefined
                                  }
                                  onSelect={(date) =>
                                    field.onChange(
                                      date?.toISOString().split("T")[0]
                                    )
                                  }
                                  disabled={(date) =>
                                    date < new Date() ||
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={taskForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Upcoming">
                                  Upcoming
                                </SelectItem>
                                <SelectItem value="In Progress">
                                  In Progress
                                </SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewTaskOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Submit</Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="upcoming"
                checked={
                  searchParams.get("status")?.includes("Upcoming") || false
                }
                onCheckedChange={() => handleStatusToggle("Upcoming")}
                className="scale-75"
              />
              <label htmlFor="upcoming" className="text-sm">
                Upcoming
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="in-progress"
                checked={
                  searchParams.get("status")?.includes("In Progress") || false
                }
                onCheckedChange={() => handleStatusToggle("In Progress")}
                className="scale-75"
              />
              <label htmlFor="in-progress" className="text-sm">
                In Progress
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="done"
                checked={searchParams.get("status")?.includes("Done") || false}
                onCheckedChange={() => handleStatusToggle("Done")}
                className="scale-75"
              />
              <label htmlFor="done" className="text-sm">
                Done
              </label>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Program Lead</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Date Modified</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task, i) => (
                <Fragment key={task.id}>
                  <TableRow>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <NextLink
                          href={`/tasks?id=${task.id}`}
                          className="font-bold hover:underline"
                        >
                          {task.title}
                        </NextLink>
                        <button
                          onClick={() =>
                            setExpandedTaskId(
                              expandedTaskId === task.id ? null : task.id
                            )
                          }
                          className="focus:outline-none"
                          title="View details"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              expandedTaskId === task.id
                                ? "transform rotate-180"
                                : ""
                            }`}
                          />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{task.programLead}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getDateColor(
                            task.dueDate
                          )}`}
                        ></div>
                        <span
                          title={format(parseISO(task.dueDate), "dd.MM.yy")}
                        >
                          {formatDueDate(task.dueDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(task.dateCreated), "dd.MM.yy")}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(task.dateModified), "dd.MM.yy")}
                    </TableCell>
                    <TableCell>{task.status}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openExternalLink(task.jiraLink)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Open Jira Link"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setNewNoteTaskId(task.id)}
                          className="text-gray-500 hover:text-gray-700"
                          title="Add Note"
                        >
                          <PlusCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setIsMarkCompletedOpen(true);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="Mark as Done"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7}>
                      {getLatestNote(task.id) && (
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">
                            {getLatestNote(task.id).text}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedTaskId === task.id && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="p-4 bg-gray-50">
                          <p className="mb-2">
                            <strong>Description:</strong> {task.description}
                          </p>
                          <h4 className="font-semibold mt-4 mb-2">Notes:</h4>
                          {notes
                            .filter((note) => note.taskId === task.id)
                            .map((note) => (
                              <div
                                key={note.id}
                                className="mb-2 p-2 bg-white rounded shadow"
                              >
                                <div className="flex justify-between items-start">
                                  <div
                                    className="prose prose-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: note.text
                                    }}
                                  />
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        noteForm.reset({ text: note.text });
                                        editor?.commands.setContent(note.text);
                                      }}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setIsDeletingNoteId(note.id)
                                      }
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Created:{" "}
                                  {format(
                                    parseISO(note.dateCreated),
                                    "dd.MM.yy HH:mm"
                                  )}
                                </p>
                              </div>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {(newNoteTaskId === task.id || editingNoteId) && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Form {...noteForm}>
                          <form
                            onSubmit={noteForm.handleSubmit(
                              editingNoteId ? handleEditNote : handleNewNote
                            )}
                            className="space-y-4 p-4 bg-gray-100"
                          >
                            <FormField
                              control={noteForm.control}
                              name="text"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {editingNoteId ? "Edit Note" : "New Note"}
                                  </FormLabel>
                                  <FormControl>
                                    <div className="border rounded-md p-2">
                                      <div className="flex space-x-2 mb-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            editor
                                              ?.chain()
                                              .focus()
                                              .toggleBold()
                                              .run()
                                          }
                                          className={
                                            editor?.isActive("bold")
                                              ? "bg-muted"
                                              : ""
                                          }
                                        >
                                          <Bold className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            editor
                                              ?.chain()
                                              .focus()
                                              .toggleItalic()
                                              .run()
                                          }
                                          className={
                                            editor?.isActive("italic")
                                              ? "bg-muted"
                                              : ""
                                          }
                                        >
                                          <Italic className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            editor
                                              ?.chain()
                                              .focus()
                                              .toggleBulletList()
                                              .run()
                                          }
                                          className={
                                            editor?.isActive("bulletList")
                                              ? "bg-muted"
                                              : ""
                                          }
                                        >
                                          <List className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const url =
                                              window.prompt("Enter the URL");
                                            if (url) {
                                              editor
                                                ?.chain()
                                                .focus()
                                                .setLink({ href: url })
                                                .run();
                                            }
                                          }}
                                          className={
                                            editor?.isActive("link")
                                              ? "bg-muted"
                                              : ""
                                          }
                                        >
                                          <LinkIcon className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <EditorContent
                                        editor={editor}
                                        className="prose prose-sm max-w-none"
                                        {...field}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setNewNoteTaskId(null);
                                  setEditingNoteId(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button type="submit">Submit</Button>
                            </div>
                          </form>
                        </Form>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <Form {...projectForm}>
            <form
              onSubmit={projectForm.handleSubmit(handleEditProject)}
              className="space-y-4"
            >
              <FormField
                control={projectForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={projectForm.control}
                name="programLead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program Lead</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditProjectOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteProjectOpen} onOpenChange={setIsDeleteProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
          </DialogHeader>
          <p>
            This action cannot be undone. This will permanently delete the
            project and all associated tasks.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMarkCompletedOpen} onOpenChange={setIsMarkCompletedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Task as Completed</DialogTitle>
          </DialogHeader>
          <p>
            Do you want to mark the task "{selectedTask?.title}" as completed?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMarkCompletedOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkCompleted}>Yes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeletingNoteId !== null}
        onOpenChange={() => setIsDeletingNoteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete this note? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletingNoteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
