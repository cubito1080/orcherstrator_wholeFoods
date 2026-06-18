import { BadRequestException } from "@nestjs/common";
import { ProjectStatus } from "../persistence/entities/enums";
import { ProjectStatusMachine } from "./project-status.machine";

describe("ProjectStatusMachine", () => {
  const machine = new ProjectStatusMachine();

  it("allows the happy-path flow", () => {
    expect(machine.canTransition(ProjectStatus.draft, ProjectStatus.uploaded)).toBe(true);
    expect(machine.canTransition(ProjectStatus.uploaded, ProjectStatus.queued)).toBe(true);
    expect(machine.canTransition(ProjectStatus.queued, ProjectStatus.needs_review)).toBe(true);
    expect(machine.canTransition(ProjectStatus.queued, ProjectStatus.complete)).toBe(true);
  });

  it("allows re-upload and re-processing from terminal states", () => {
    expect(machine.canTransition(ProjectStatus.complete, ProjectStatus.queued)).toBe(true);
    expect(machine.canTransition(ProjectStatus.failed, ProjectStatus.uploaded)).toBe(true);
    expect(machine.canTransition(ProjectStatus.needs_review, ProjectStatus.queued)).toBe(true);
  });

  it("treats same-state transitions as no-ops", () => {
    expect(machine.canTransition(ProjectStatus.needs_review, ProjectStatus.needs_review)).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(machine.canTransition(ProjectStatus.draft, ProjectStatus.complete)).toBe(false);
    expect(() => machine.assert(ProjectStatus.draft, ProjectStatus.needs_review)).toThrow(
      BadRequestException,
    );
  });
});
