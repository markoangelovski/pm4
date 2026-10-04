import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateTaskDto } from "./create-task.dto.js";
import { UpdateTaskDto } from "./update-task.dto.js";

const PROJECT_ID = "0190a000-0000-7000-8000-0000000000a1";

async function errorFields<T extends object>(
  cls: new () => T,
  body: object
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  return errors.map((e) => e.property);
}

describe("task DTOs", () => {
  it("create accepts null and empty strings for the optional fields", async () => {
    const body = {
      projectId: PROJECT_ID,
      title: "Fix",
      description: null,
      externalLink: "",
      dueDate: null,
      projectLeadUserId: null,
      projectLeadName: ""
    };
    expect(await errorFields(CreateTaskDto, body)).toEqual([]);
    expect(plainToInstance(CreateTaskDto, body)).toMatchObject({
      externalLink: null,
      projectLeadName: null
    });
  });

  it("create rejects status null and unknown values", async () => {
    const base = { projectId: PROJECT_ID, title: "Fix" };
    expect(await errorFields(CreateTaskDto, { ...base, status: null })).toEqual(
      ["status"]
    );
    expect(
      await errorFields(CreateTaskDto, { ...base, status: "done" })
    ).toEqual(["status"]);
  });

  it("update accepts null to clear the optional fields, not the required ones", async () => {
    expect(
      await errorFields(UpdateTaskDto, {
        description: null,
        externalLink: null,
        dueDate: null,
        projectLeadUserId: null,
        projectLeadName: null
      })
    ).toEqual([]);
    expect(await errorFields(UpdateTaskDto, {})).toEqual([]);
    expect(
      (
        await errorFields(UpdateTaskDto, {
          title: null,
          status: null,
          projectId: null
        })
      ).sort()
    ).toEqual(["projectId", "status", "title"]);
  });
});
