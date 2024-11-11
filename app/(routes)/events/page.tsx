"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Plus,
  ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type Log = {
  id: string;
  title: string;
  duration: number;
};

type Event = {
  id: string;
  title: string;
  creationDate: Date;
  taskTitle?: string;
  taskId?: string;
  duration: number;
  logs: Log[];
  totalBooked: number;
};

const mockData: Event[] = [
  {
    id: "1",
    title: "Project Kickoff",
    creationDate: new Date("2023-06-01"),
    taskTitle: "Planning",
    taskId: "task1",
    duration: 120,
    logs: [
      { id: "1-1", title: "Meeting preparation", duration: 30 },
      { id: "1-2", title: "Team discussion", duration: 60 },
      { id: "1-3", title: "Documentation", duration: 30 }
    ],
    totalBooked: 90
  },
  {
    id: "2",
    title: "Client Presentation",
    creationDate: new Date("2023-06-02"),
    taskTitle: "Client Communication",
    taskId: "task2",
    duration: 90,
    logs: [
      { id: "2-1", title: "Slide creation", duration: 45 },
      { id: "2-2", title: "Rehearsal", duration: 30 },
      { id: "2-3", title: "Actual presentation", duration: 15 }
    ],
    totalBooked: 60
  }
];

const mockTasks = [
  { id: "task1", title: "Planning" },
  { id: "task2", title: "Client Communication" },
  { id: "task3", title: "Development" },
  { id: "task4", title: "Testing" },
  { id: "task5", title: "Deployment" }
];

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
  logTitle: z.string().optional(),
  logDuration: z.number().min(0).optional()
});

const logSchema = z.object({
  title: z.string().min(1, "Title is required"),
  duration: z.number().min(0).default(0)
});

export default function Stats() {
  const [events, setEvents] = useState<Event[]>(mockData);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingLog, setEditingLog] = useState<{
    eventId: string;
    log: Log;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "event" | "log";
    id: string;
    title: string;
  } | null>(null);
  const [addingLog, setAddingLog] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [taskSearch, setTaskSearch] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<typeof mockTasks>([]);

  const handleAddEvent = useCallback((data: z.infer<typeof eventSchema>) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newEvent: Event = {
      ...data,
      id: newId,
      creationDate: new Date(),
      duration: data.logDuration || 0,
      logs: [],
      totalBooked: 0
    };

    if (data.logTitle) {
      const logId = Math.random().toString(36).substr(2, 9);
      newEvent.logs.push({
        id: logId,
        title: data.logTitle,
        duration: data.logDuration || 0
      });
    }

    setEvents((prev) => [...prev, newEvent]);
  }, []);

  const handleUpdateEvent = useCallback(
    (data: z.infer<typeof eventSchema>) => {
      if (editingEvent) {
        setEvents((prev) =>
          prev.map((e) => (e.id === editingEvent.id ? { ...e, ...data } : e))
        );
        setEditingEvent(null);
      }
    },
    [editingEvent]
  );

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setDeleteConfirm(null);
  }, []);

  const handleAddLog = useCallback(
    (eventId: string, data: z.infer<typeof logSchema>) => {
      const newId = Math.random().toString(36).substr(2, 9);
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id === eventId) {
            const newLogs = [...e.logs, { id: newId, ...data }];
            return {
              ...e,
              logs: newLogs,
              duration: newLogs.reduce((sum, l) => sum + l.duration, 0)
            };
          }
          return e;
        })
      );
      setAddingLog(null);
    },
    []
  );

  const handleUpdateLog = useCallback(
    (data: z.infer<typeof logSchema>) => {
      if (editingLog) {
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === editingLog.eventId) {
              const newLogs = e.logs.map((l) =>
                l.id === editingLog.log.id ? { ...l, ...data } : l
              );
              return {
                ...e,
                logs: newLogs,
                duration: newLogs.reduce((sum, l) => sum + l.duration, 0)
              };
            }
            return e;
          })
        );
        setEditingLog(null);
      }
    },
    [editingLog]
  );

  const handleDeleteLog = useCallback((eventId: string, logId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === eventId) {
          const newLogs = e.logs.filter((l) => l.id !== logId);
          return {
            ...e,
            logs: newLogs,
            duration: newLogs.reduce((sum, l) => sum + l.duration, 0)
          };
        }
        return e;
      })
    );
    setDeleteConfirm(null);
  }, []);

  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (remainingMinutes > 0) {
      return `${remainingMinutes}min`;
    } else {
      return "0min";
    }
  }, []);

  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  const toggleAddingLog = useCallback((eventId: string) => {
    setAddingLog((prev) => (prev === eventId ? null : eventId));
  }, []);

  const totalWorked = useMemo(
    () => events.reduce((sum, event) => sum + event.duration, 0),
    [events]
  );
  const totalBooked = useMemo(
    () => events.reduce((sum, event) => sum + event.totalBooked, 0),
    [events]
  );

  const PieChartCard = ({ title, value }: { title: string; value: number }) => {
    const remainingTime = Math.max(450 - value, 0); // 7.5 hours = 450 minutes
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Value", value: value },
                    { name: "Remaining", value: remainingTime }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell key="cell-0" fill="#82ca9d" />
                  <Cell key="cell-1" fill="#ccc" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center mt-4">{formatDuration(value)}</p>
        </CardContent>
      </Card>
    );
  };

  const EventForm = ({
    onSubmit,
    initialData
  }: {
    onSubmit: (data: z.infer<typeof eventSchema>) => void;
    initialData?: Partial<Event>;
  }) => {
    const {
      register,
      handleSubmit,
      control,
      watch,
      setValue,
      formState: { errors }
    } = useForm<z.infer<typeof eventSchema>>({
      resolver: zodResolver(eventSchema),
      defaultValues: initialData || {}
    });

    const watchTaskTitle = watch("taskTitle");

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="text-right">
            Title
          </Label>
          <div className="col-span-3">
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="task" className="text-right">
            Task
          </Label>
          <div className="col-span-3">
            <Controller
              name="taskTitle"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setTaskSearch(e.target.value);
                    setFilteredTasks(
                      mockTasks.filter((task) =>
                        task.title
                          .toLowerCase()
                          .includes(e.target.value.toLowerCase())
                      )
                    );
                  }}
                  placeholder="Search for a task"
                />
              )}
            />
            {filteredTasks.length > 0 && (
              <select
                className="mt-2 w-full border rounded"
                onChange={(e) => {
                  const selectedTask = mockTasks.find(
                    (task) => task.id === e.target.value
                  );
                  if (selectedTask) {
                    setValue("taskTitle", selectedTask.title);
                    setValue("taskId", selectedTask.id);
                    setTaskSearch("");
                    setFilteredTasks([]);
                  }
                }}
              >
                <option value="">Select a task</option>
                {filteredTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {!initialData && (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logTitle" className="text-right">
                Log Title (optional)
              </Label>
              <Input
                id="logTitle"
                {...register("logTitle")}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logDuration" className="text-right">
                Log Duration (optional)
              </Label>
              <Controller
                name="logDuration"
                control={control}
                defaultValue={0}
                render={({ field }) => (
                  <Input
                    type="number"
                    id="logDuration"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        Math.round(Number(e.target.value) / 15) * 15
                      )
                    }
                    className="col-span-3"
                  />
                )}
              />
            </div>
          </>
        )}
        <DialogFooter>
          <Button type="submit">
            {initialData ? "Update Event" : "Add Event"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  const LogForm = ({
    onSubmit,
    onCancel,
    initialData
  }: {
    onSubmit: (data: z.infer<typeof logSchema>) => void;
    onCancel: () => void;
    initialData?: Partial<Log>;
  }) => {
    const {
      register,
      handleSubmit,
      control,
      formState: { errors }
    } = useForm<z.infer<typeof logSchema>>({
      resolver: zodResolver(logSchema),
      defaultValues: initialData || { duration: 0 }
    });

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="log-title" className="text-right">
            Title
          </Label>
          <div className="col-span-3">
            <Input id="log-title" {...register("title")} />
            {errors.title && (
              <p className="text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="log-duration" className="text-right">
            Duration (min)
          </Label>
          <Controller
            name="duration"
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                id="log-duration"
                {...field}
                onChange={(e) =>
                  field.onChange(Math.round(Number(e.target.value) / 15) * 15)
                }
                className="col-span-3"
              />
            )}
          />
          {errors.duration && (
            <p className="text-red-500 text-sm col-start-2 col-span-3">
              {errors.duration.message}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? "Update Log" : "Add Log"}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {format(new Date(), "MMMM d, yyyy")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PieChartCard title="Total Worked" value={totalWorked} />
        <PieChartCard title="Total Booked" value={totalBooked} />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mb-4">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
          </DialogHeader>
          <EventForm onSubmit={handleAddEvent} />
        </DialogContent>
      </Dialog>

      {events.map((event) => (
        <Collapsible key={event.id} className="mb-4 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{event.title}</h2>
              <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                <ListChecks className="h-4 w-4" />
                <Link
                  href={`/tasks?id=${event.taskId}`}
                  className="hover:underline"
                >
                  {event.taskTitle}
                </Link>
                <span>-</span>
                <span>{format(event.creationDate, "MMM d, yyyy")}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Total worked: {formatDuration(event.duration)}
              </p>
              <p className="text-sm text-gray-500">
                Total booked: {formatDuration(event.totalBooked)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleAddingLog(event.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleEventExpansion(event.id)}
                >
                  {expandedEvents.has(event.id) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingEvent(event)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setDeleteConfirm({
                    type: "event",
                    id: event.id,
                    title: event.title
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {addingLog === event.id && (
            <div className="mt-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Add New Log</h3>
              <LogForm
                onSubmit={(data) => handleAddLog(event.id, data)}
                onCancel={() => setAddingLog(null)}
              />
            </div>
          )}
          <CollapsibleContent>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.title}</TableCell>
                    <TableCell>{formatDuration(log.duration)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditingLog({ eventId: event.id, log })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteConfirm({
                            type: "log",
                            id: log.id,
                            title: log.title
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              onSubmit={handleUpdateEvent}
              initialData={editingEvent}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Log Dialog */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Log</DialogTitle>
          </DialogHeader>
          {editingLog && (
            <LogForm
              onSubmit={handleUpdateLog}
              onCancel={() => setEditingLog(null)}
              initialData={editingLog.log}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete {deleteConfirm?.title}?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirm?.type === "event") {
                  handleDeleteEvent(deleteConfirm.id);
                } else if (deleteConfirm?.type === "log") {
                  const event = events.find((e) =>
                    e.logs.some((l) => l.id === deleteConfirm.id)
                  );
                  if (event) handleDeleteLog(event.id, deleteConfirm.id);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
