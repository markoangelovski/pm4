import { BadRequestException, Injectable } from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import {
  DayResponseDto,
  WorkdayListResponseDto,
  WorkdayResponseDto
} from "./dto/workday-response.dto.js";
import { WorkdaysQueryDto } from "./dto/workdays-query.dto.js";
import { TimeRepository } from "./time.repository.js";
import {
  assertDate,
  assertNotFuture,
  daysBetween,
  toTimeLogDto
} from "./time-logs.service.js";

const MAX_RANGE_DAYS = 366;

/** Workdays (API-WD-001…003), always the caller's own. */
@Injectable()
export class WorkdaysService {
  constructor(
    private readonly timeRepository: TimeRepository,
    private readonly usersRepository: UsersRepository
  ) {}

  async getDay(userId: string, date: string): Promise<DayResponseDto> {
    assertDate(date, "date");
    const startMinute = await this.timeRepository.getWorkday(userId, date);
    const rows = await this.timeRepository.listDay(userId, date);
    return {
      workDate: date,
      startMinute,
      totalMinutes: rows.reduce((sum, row) => sum + row.durationMinutes, 0),
      logs: rows.map(toTimeLogDto)
    };
  }

  async list(
    userId: string,
    query: WorkdaysQueryDto
  ): Promise<WorkdayListResponseDto> {
    const days = daysBetween(query.from, query.to);
    if (days < 0 || days > MAX_RANGE_DAYS) {
      throw new BadRequestException({
        errors: [
          {
            field: "to",
            message: `must not be before from and at most ${MAX_RANGE_DAYS} days after it`
          }
        ]
      });
    }
    const items = await this.timeRepository.listWorkdays(
      userId,
      query.from,
      query.to
    );
    return { items };
  }

  async setStart(
    userId: string,
    date: string,
    startMinute: number
  ): Promise<WorkdayResponseDto> {
    assertDate(date, "date");
    await assertNotFuture(this.usersRepository, userId, date, "date");
    await this.timeRepository.upsertWorkday(userId, date, startMinute);
    return { workDate: date, startMinute };
  }
}
