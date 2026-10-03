import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ProjectLeadService } from "./project-lead.service.js";
import { UsersRepository } from "./users.repository.js";

describe("ProjectLeadService", () => {
  let service: ProjectLeadService;
  const findLeadUser =
    vi.fn<
      (id: string) => Promise<{ id: string; displayName: string } | null>
    >();

  beforeEach(async () => {
    findLeadUser.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectLeadService,
        { provide: UsersRepository, useValue: { findLeadUser } }
      ]
    }).compile();

    service = module.get<ProjectLeadService>(ProjectLeadService);
  });

  const errorsOf = async (promise: Promise<unknown>) => {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse();
  };

  describe("toColumns", () => {
    it("a user id → the id and the user's current name", async () => {
      findLeadUser.mockResolvedValue({ id: "u-1", displayName: "Barbara" });
      await expect(
        service.toColumns({ projectLeadUserId: "u-1" }, false)
      ).resolves.toEqual({ projectLeadUserId: "u-1", projectLead: "Barbara" });
      expect(findLeadUser).toHaveBeenCalledWith("u-1");
    });

    it("an unknown user id → 400 on projectLeadUserId", async () => {
      findLeadUser.mockResolvedValue(null);
      await expect(
        errorsOf(service.toColumns({ projectLeadUserId: "u-x" }, false))
      ).resolves.toEqual({
        errors: [
          { field: "projectLeadUserId", message: "must be an existing user" }
        ]
      });
    });

    it("both fields set → 400 on projectLeadName, without a lookup", async () => {
      await expect(
        errorsOf(
          service.toColumns(
            { projectLeadUserId: "u-1", projectLeadName: "Ana" },
            false
          )
        )
      ).resolves.toEqual({
        errors: [
          {
            field: "projectLeadName",
            message: "must be empty when projectLeadUserId is set"
          }
        ]
      });
      expect(findLeadUser).not.toHaveBeenCalled();
    });

    it("a name → a text lead", async () => {
      await expect(
        service.toColumns({ projectLeadName: "Ana" }, false)
      ).resolves.toEqual({ projectLeadUserId: null, projectLead: "Ana" });
    });

    it("neither on POST → no lead", async () => {
      await expect(service.toColumns({}, false)).resolves.toEqual({
        projectLeadUserId: null,
        projectLead: null
      });
    });

    it("neither on PATCH → undefined (leave unchanged)", async () => {
      await expect(service.toColumns({}, true)).resolves.toBeUndefined();
    });

    it("one field on PATCH replaces the lead as a unit", async () => {
      await expect(
        service.toColumns({ projectLeadUserId: null }, true)
      ).resolves.toEqual({ projectLeadUserId: null, projectLead: null });
      await expect(
        service.toColumns({ projectLeadName: "X" }, true)
      ).resolves.toEqual({ projectLeadUserId: null, projectLead: "X" });
    });
  });

  describe("toDto", () => {
    const none = {
      projectLeadUserId: null,
      projectLead: null,
      leadDisplayName: null,
      leadAvatarUrl: null
    };

    it("a joined user → kind user with the current name", () => {
      expect(
        service.toDto({
          projectLeadUserId: "u-1",
          projectLead: "Old name",
          leadDisplayName: "New name",
          leadAvatarUrl: "https://x.test/a.png"
        })
      ).toEqual({
        kind: "user",
        name: "New name",
        user: {
          id: "u-1",
          displayName: "New name",
          avatarUrl: "https://x.test/a.png"
        }
      });
    });

    it("a saved name only → kind text", () => {
      expect(service.toDto({ ...none, projectLead: "Ana" })).toEqual({
        kind: "text",
        name: "Ana",
        user: null
      });
    });

    it("no lead → null", () => {
      expect(service.toDto(none)).toBeNull();
    });
  });
});
