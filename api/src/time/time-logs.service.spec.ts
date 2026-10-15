import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ProjectsService } from "../projects/projects.service.js";
import { TasksService } from "../tasks/tasks.service.js";
import { UsersRepository } from "../users/users.repository.js";
import { TimeLogsService } from "./time-logs.service.js";
import { TimeRepository } from "./time.repository.js";

const ID = "0190a000-0000-7000-8000-000000000001";

describe("TimeLogsService", () => {
  const repository = {
    getWorkday: vi.fn(),
    insertLog: vi.fn(),
    findLog: vi.fn(),
    updateLog: vi.fn(),
    deleteLog: vi.fn()
  };
  const users = { findById: vi.fn() };
  const tasks = { findOwned: vi.fn() };
  const projects = { findOwned: vi.fn() };
  let service: TimeLogsService;

  beforeEach(async () => {
    vi.resetAllMocks();
    users.findById.mockResolvedValue({ timeZone: "UTC" });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeLogsService,
        { provide: TimeRepository, useValue: repository },
        { provide: UsersRepository, useValue: users },
        { provide: TasksService, useValue: tasks },
        { provide: ProjectsService, useValue: projects }
      ]
    }).compile();
    service = module.get(TimeLogsService);
  });

  it("create requires dayStartMinute when the date has no workday", async () => {
    repository.getWorkday.mockResolvedValue(null);
    await expect(
      service.create("u", {
        workDate: "2020-01-01",
        durationMinutes: 15,
        text: "x"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.insertLog).not.toHaveBeenCalled();
  });

  it("create rejects a future date", async () => {
    await expect(
      service.create("u", {
        workDate: "2999-01-01",
        durationMinutes: 15,
        text: "x",
        dayStartMinute: 540
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("update and remove of a missing or non-UUID log → 404", async () => {
    await expect(service.update("u", "abc", {})).rejects.toBeInstanceOf(
      NotFoundException
    );
    repository.findLog.mockResolvedValue(null);
    await expect(service.remove("u", ID)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("create with a missing user row → 401, not a UTC fallback", async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      service.create("u", {
        workDate: "2020-01-01",
        durationMinutes: 15,
        text: "x",
        dayStartMinute: 540
      })
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("update skips the future check when workDate is unchanged", async () => {
    const log = { id: ID, workDate: "2999-01-01" };
    repository.findLog.mockResolvedValue(log);
    repository.updateLog.mockResolvedValue(undefined);
    await expect(
      service.update("u", ID, { workDate: "2999-01-01", text: "y" })
    ).resolves.toBeDefined();
    expect(repository.updateLog).toHaveBeenCalledWith(
      "u",
      ID,
      { text: "y" },
      null
    );
  });

  it("update rejects a changed workDate after today", async () => {
    repository.findLog.mockResolvedValue({ id: ID, workDate: "2020-01-01" });
    await expect(
      service.update("u", ID, { workDate: "2999-01-01", dayStartMinute: 540 })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateLog).not.toHaveBeenCalled();
  });

  describe("update clears the booking when the log becomes unbookable (D5)", () => {
    const PROJECT = "0190a000-0000-7000-8000-0000000000a1";
    const OTHER = "0190a000-0000-7000-8000-0000000000a2";
    const booked = {
      id: ID,
      workDate: "2020-01-01",
      taskId: null,
      projectId: PROJECT,
      deletedProjectTitle: null,
      excludeFromStats: false,
      bookingDate: "2020-01-02"
    };
    const values = () =>
      repository.updateLog.mock.calls[0][2] as Record<string, unknown>;

    it("taskId and projectId both null → bookingDate null", async () => {
      repository.findLog.mockResolvedValue(booked);
      await service.update("u", ID, { taskId: null, projectId: null });
      expect(values()).toEqual({
        taskId: null,
        projectId: null,
        deletedTaskTitle: null,
        deletedProjectTitle: null,
        bookingDate: null
      });
    });

    it("a deleted-project log unlinked with projectId null → retained names and booking cleared", async () => {
      repository.findLog.mockResolvedValue({
        ...booked,
        projectId: null,
        deletedProjectTitle: "Old project",
        deletedTaskTitle: "Old task"
      });
      await service.update("u", ID, { projectId: null });
      expect(values()).toEqual({
        taskId: null,
        projectId: null,
        deletedTaskTitle: null,
        deletedProjectTitle: null,
        bookingDate: null
      });
    });

    it("excludeFromStats true → bookingDate null", async () => {
      repository.findLog.mockResolvedValue(booked);
      await service.update("u", ID, { excludeFromStats: true });
      expect(values()).toEqual({ excludeFromStats: true, bookingDate: null });
    });

    it("a move to another project keeps the booking", async () => {
      repository.findLog.mockResolvedValue(booked);
      projects.findOwned.mockResolvedValue({ id: OTHER });
      await service.update("u", ID, { projectId: OTHER });
      expect(values()).toEqual({
        taskId: null,
        projectId: OTHER,
        deletedTaskTitle: null,
        deletedProjectTitle: null
      });
    });

    it("a deleted-project log keeps its booking through an edit", async () => {
      repository.findLog.mockResolvedValue({
        ...booked,
        projectId: null,
        deletedProjectTitle: "Old project"
      });
      await service.update("u", ID, { text: "y" });
      expect(values()).toEqual({ text: "y" });
    });
  });
});
