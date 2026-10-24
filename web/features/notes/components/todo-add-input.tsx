"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group";
import { useCreateTodo } from "../api";
import { TODO_TEXT_MAX, type NoteLink } from "../schemas";

/** "Add a to-do": Enter adds it with `link` and keeps the box focused for the next one. */
export function TodoAddInput({
  link,
  placeholder = "Add a to-do"
}: {
  link: NoteLink;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const create = useCreateTodo();
  const add = async () => {
    const value = text.trim();
    if (!value || create.isPending) return;
    try {
      await create.mutateAsync({
        text: value,
        ...(link.task
          ? { taskId: link.task.id }
          : { projectId: link.project?.id ?? null })
      });
      setText("");
    } catch {
      toast.error("Couldn't add the to-do.");
    }
  };
  return (
    <InputGroup className="h-8 rounded-md! border-dashed shadow-none">
      <InputGroupAddon>
        <Plus className="text-muted-foreground" />
      </InputGroupAddon>
      <InputGroupInput
        value={text}
        maxLength={TODO_TEXT_MAX}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void add();
          }
        }}
        className="text-sm"
      />
    </InputGroup>
  );
}
