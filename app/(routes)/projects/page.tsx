"use client";

import { Suspense, useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from "@/components/ui/card";
import ProjectDetail from "./project.detail";
import Header from "@/components/pm/Header/Header";

// Mock data for existing projects
const mockProjects = [
  {
    id: 1,
    name: "Website Redesign",
    lead: "John Doe",
    tasks: 15,
    created: "2023-05-15",
    updated: "2024-06-16"
  },
  {
    id: 2,
    name: "Mobile App Development",
    lead: "Jane Smith",
    tasks: 22,
    created: "2023-06-01",
    updated: "2024-07-10"
  },
  {
    id: 3,
    name: "Database Migration",
    lead: "Bob Johnson",
    tasks: 8,
    created: "2023-06-10",
    updated: "2024-04-05"
  }
];

// Zod schema for new project form
const newProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  lead: z.string().min(1, "Program lead is required")
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

function ProjectsComponent() {
  const [projects, setProjects] = useState(mockProjects);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = new URLSearchParams(searchParams).get("id");

  const form = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      lead: ""
    }
  });

  const handleSort = (sortType: string) => {
    const sortedProjects = [...projects];
    switch (sortType) {
      case "name":
        sortedProjects.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        sortedProjects.sort(
          (a, b) =>
            new Date(b.created).getTime() - new Date(a.created).getTime()
        );
        break;
      case "updated":
        // Assuming 'updated' field exists, otherwise fallback to 'created'
        sortedProjects.sort(
          (a, b) =>
            new Date(b.updated || b.created).getTime() -
            new Date(a.updated || a.created).getTime()
        );
        break;
    }
    setProjects(sortedProjects);
  };

  const handleNewProject = (data: NewProjectFormData) => {
    const createdProject = {
      ...data,
      id: projects.length + 1,
      tasks: 0,
      created: new Date().toISOString().split("T")[0],
      updated: new Date().toISOString().split("T")[0]
    };
    setProjects([...projects, createdProject]);
    setIsNewProjectOpen(false);
    form.reset();
  };

  if (projectId) return <ProjectDetail />;

  return (
    <>
      <Header breadcrumbs={["Projects"]} />
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardDescription>
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
                <div className="w-full md:w-1/2 flex items-center">
                  <div className="flex items-center border border-gray-200 px-2 py-1 rounded-md">
                    <Search className="text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Find project"
                      className=" w-full border-none"
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
                      <DropdownMenuItem onSelect={() => handleSort("newest")}>
                        Newest
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleSort("updated")}>
                        Last Updated
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog
                    open={isNewProjectOpen}
                    onOpenChange={setIsNewProjectOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>New</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(handleNewProject)}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
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
                            control={form.control}
                            name="lead"
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
                              onClick={() => setIsNewProjectOpen(false)}
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
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Program Lead</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell
                      className="font-medium cursor-pointer"
                      onClick={() => router.push(`/projects?id=${project.id}`)}
                    >
                      {project.name}
                    </TableCell>
                    <TableCell>{project.lead}</TableCell>
                    <TableCell>{project.tasks}</TableCell>
                    <TableCell>{project.created}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function Projects() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProjectsComponent />
    </Suspense>
  );
}
