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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ArrowLeft } from "lucide-react";
import Header from "@/components/pm/Header/Header";
import TasksList from "@/components/pm/TasksList/TasksList";
import { mockNotes, mockProject, mockTasks } from "@/mock";
import { Note, Project, Task, TaskStatus } from "@/types";

const projectSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  description: z.string().optional(),
  programLead: z.string().min(1, "Program lead is required")
});

const noteSchema = z.object({
  text: z.string().min(1, "Note text is required")
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectDetail() {
  const router = useRouter();

  const [project, setProject] = useState<Project>(mockProject);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
  });

  const handleEditProject = (data: ProjectFormData) => {
    setProject({ ...project, ...data });
    setIsEditProjectOpen(false);
  };

  const handleDeleteProject = () => {
    // In a real application, you would delete the project here
    alert("Project deleted");
    setIsDeleteProjectOpen(false);
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
    <>
      <Header breadcrumbs={["Projects", project.title]} />
      <div className="container mx-auto p-4 space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/projects")}
          className=""
        >
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

        <TasksList tasksList={mockTasks} />

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

        <Dialog
          open={isDeleteProjectOpen}
          onOpenChange={setIsDeleteProjectOpen}
        >
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
      </div>
    </>
  );
}
