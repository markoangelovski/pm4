"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import Header from "@/components/pm/Header/Header";

// Sample data structure
interface Log {
  title: string;
  duration: number;
}

interface Booking {
  amount: number;
  bookedTo: Date;
}

interface Event {
  title: string;
  task: string;
  taskId: number;
  date: Date;
  bookedHours: number;
  externalBooking: number;
  logs: Log[];
  bookings: Booking[];
}

// Sample data
const sampleData: Event[] = [
  {
    title: "Project A Meeting",
    task: "Client Meeting",
    taskId: 1,
    date: new Date("2023-07-10"),
    bookedHours: 2,
    externalBooking: 1,
    logs: [
      { title: "Preparation", duration: 30 },
      { title: "Meeting", duration: 90 },
      { title: "Follow-up", duration: 30 }
    ],
    bookings: [
      { amount: 2, bookedTo: new Date("2023-07-10") },
      { amount: 1, bookedTo: new Date("2023-07-11") }
    ]
  },
  {
    title: "Code Review",
    task: "Development",
    taskId: 2,
    date: new Date("2023-07-10"),
    bookedHours: 3,
    externalBooking: 2,
    logs: [
      { title: "Review PRs", duration: 120 },
      { title: "Feedback Session", duration: 60 }
    ],
    bookings: [
      { amount: 3, bookedTo: new Date("2023-07-10") },
      { amount: 2, bookedTo: new Date("2023-07-12") }
    ]
  },
  {
    title: "Bug Fixing",
    task: "Maintenance",
    taskId: 3,
    date: new Date("2023-07-11"),
    bookedHours: 4,
    externalBooking: 3,
    logs: [
      { title: "Investigate Issues", duration: 90 },
      { title: "Fix Bugs", duration: 120 },
      { title: "Testing", duration: 60 }
    ],
    bookings: [
      { amount: 4, bookedTo: new Date("2023-07-11") },
      { amount: 3, bookedTo: new Date("2023-07-13") }
    ]
  },
  {
    title: "Team Sync",
    task: "Internal Meeting",
    taskId: 4,
    date: new Date("2023-07-11"),
    bookedHours: 1,
    externalBooking: 0,
    logs: [
      { title: "Status Update", duration: 30 },
      { title: "Planning", duration: 30 }
    ],
    bookings: [{ amount: 1, bookedTo: new Date("2023-07-11") }]
  },
  {
    title: "Feature Development",
    task: "Development",
    taskId: 5,
    date: new Date("2023-07-12"),
    bookedHours: 6,
    externalBooking: 4,
    logs: [
      { title: "Planning", duration: 60 },
      { title: "Coding", duration: 240 },
      { title: "Unit Testing", duration: 90 }
    ],
    bookings: [
      { amount: 6, bookedTo: new Date("2023-07-12") },
      { amount: 4, bookedTo: new Date("2023-07-14") }
    ]
  }
];

// Helper functions
const groupEventsByDate = (events: Event[]) => {
  const grouped = events.reduce((acc, event) => {
    const dateStr = event.date.toISOString().split("T")[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return Object.entries(grouped).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );
};

const calculateHoursWorked = (event: Event) => {
  return event.logs.reduce((sum, log) => sum + log.duration / 60, 0);
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}min`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
};

const getWeekRange = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: start, to: end };
};

export default function Stats() {
  const [dateRange, setDateRange] = useState(getWeekRange());
  const groupedEvents = groupEventsByDate(sampleData);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>(
    {}
  );

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically fetch new data based on the selected date range
    console.log("Fetching data for range:", dateRange);
  };

  return (
    <>
      <Header breadcrumbs={["Stats"]} />
      <div className="container mx-auto p-4">
        {" "}
        <div className="space-y-8">
          <div className="flex justify-end">
            <form
              onSubmit={handleSubmit}
              className="flex items-center space-x-2"
            >
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    {dateRange.from ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {dateRange.to
                          ? format(dateRange.to, "LLL dd, y")
                          : "Select end date"}
                      </>
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    // onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button type="submit">Submit</Button>
            </form>
          </div>
          {groupedEvents.map(([date, events]) => {
            const totalHoursWorked = events.reduce(
              (sum, event) => sum + calculateHoursWorked(event),
              0
            );
            const totalHoursBooked = events.reduce(
              (sum, event) => sum + event.bookedHours,
              0
            );
            const totalExternalBookings = events.reduce(
              (sum, event) => sum + event.externalBooking,
              0
            );
            const overtime = Math.max(totalHoursWorked - 7.5, 0);

            const pieChartData = [
              { name: "Worked", value: totalHoursWorked, color: "#4CAF50" },
              {
                name: "Remaining",
                value: Math.max(7.5 - totalHoursWorked, 0),
                color: "#E0E0E0"
              }
            ];

            return (
              <div key={date} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Worked
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center">
                      <div className="w-16 h-16 mr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={15}
                              outerRadius={30}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatDuration(totalHoursWorked * 60)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Booked
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center">
                      <div className="w-16 h-16 mr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Booked",
                                  value: totalHoursBooked,
                                  color: "#2196F3"
                                },
                                {
                                  name: "Remaining",
                                  value: Math.max(7.5 - totalHoursBooked, 0),
                                  color: "#E0E0E0"
                                }
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={15}
                              outerRadius={30}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatDuration(totalHoursBooked * 60)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        External Bookings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center">
                      <div className="w-16 h-16 mr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "External",
                                  value: totalExternalBookings,
                                  color: "#FFC107"
                                },
                                {
                                  name: "Remaining",
                                  value: Math.max(
                                    7.5 - totalExternalBookings,
                                    0
                                  ),
                                  color: "#E0E0E0"
                                }
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={15}
                              outerRadius={30}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatDuration(totalExternalBookings * 60)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Overtime
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center">
                      <div className="w-16 h-16 mr-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Overtime",
                                  value: overtime,
                                  color: "#F44336"
                                },
                                {
                                  name: "Regular",
                                  value: Math.min(7.5, totalHoursWorked),
                                  color: "#E0E0E0"
                                }
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={15}
                              outerRadius={30}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatDuration(overtime * 60)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {new Date(date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit"
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Book</TableHead>
                          <TableHead>Worked</TableHead>
                          <TableHead>Booked</TableHead>
                          <TableHead>External Bookings</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead className="sr-only">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((event, index) => {
                          const eventId = `${date}-${index}`;
                          const isExpanded = expandedEvents[eventId];
                          return (
                            <Fragment key={eventId}>
                              <TableRow key={eventId}>
                                <TableCell className="font-medium flex items-center justify-between">
                                  <span className="font-bold">
                                    {event.title}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      toggleEventExpansion(eventId)
                                    }
                                    aria-label={
                                      isExpanded
                                        ? "Collapse event details"
                                        : "Expand event details"
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell className="text-right">
                                  <BookingForm onBook={() => {}} />
                                </TableCell>
                                <TableCell>
                                  {formatDuration(
                                    calculateHoursWorked(event) * 60
                                  )}
                                </TableCell>
                                <TableCell>
                                  {formatDuration(event.bookedHours * 60)}
                                </TableCell>
                                <TableCell>
                                  {event.bookings.map((booking, index) => (
                                    <div key={index}>
                                      {formatDuration(booking.amount * 60)}
                                    </div>
                                  ))}
                                </TableCell>
                                <TableCell>
                                  {event.bookings.map((booking, index) => (
                                    <div key={index}>
                                      {booking.bookedTo.toLocaleDateString(
                                        "en-GB",
                                        {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "2-digit"
                                        }
                                      )}
                                    </div>
                                  ))}
                                </TableCell>
                                <TableCell>
                                  <Link
                                    href={`/tasks?id=${event.taskId}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    {event.task}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      window.open(
                                        `/tasks?id=${event.taskId}`,
                                        "Task Details",
                                        "width=600,height=400"
                                      )
                                    }
                                    aria-label="Open task details"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={7}>
                                    <div className="p-4">
                                      <h4 className="font-semibold mb-2">
                                        Logs
                                      </h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          {event.logs.map((log, logIndex) => (
                                            <div key={logIndex}>
                                              {log.title}
                                            </div>
                                          ))}
                                        </div>
                                        <div>
                                          {event.logs.map((log, logIndex) => (
                                            <div key={logIndex}>
                                              {formatDuration(log.duration)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function BookingForm({
  onBook
}: {
  onBook: (amount: number, date: Date) => void;
}) {
  const [amount, setAmount] = useState(0.25);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) {
      onBook(amount, date);
      setAmount(0.25);
      setDate(new Date());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end space-x-2">
      <div>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          step={0.25}
          min={0.25}
          className="w-20"
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[130px] justify-start text-left font-normal"
          >
            {date ? format(date, "dd.MM.yyyy") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Button type="submit">Book</Button>
    </form>
  );
}
