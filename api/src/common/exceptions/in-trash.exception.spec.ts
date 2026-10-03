import { NotFoundException } from "@nestjs/common";
import { InTrashException } from "./in-trash.exception.js";

describe("InTrashException", () => {
  it("is a 404 carrying the in-trash problem type and extensions", () => {
    const exception = new InTrashException("Project is in the trash.", {
      projectId: "p-1"
    });

    expect(exception).toBeInstanceOf(NotFoundException);
    expect(exception.getStatus()).toBe(404);
    expect(exception.getResponse()).toEqual({
      message: "Project is in the trash.",
      problemType: "in-trash",
      extensions: { projectId: "p-1" }
    });
  });

  it("defaults to no extensions", () => {
    expect(new InTrashException("x").getResponse()).toMatchObject({
      extensions: {}
    });
  });
});
