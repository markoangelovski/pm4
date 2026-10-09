import { ApiProperty } from "@nestjs/swagger";
import { RefDto } from "../../common/dto/ref.dto.js";

/** `TimeLog` (endpoints.md *Shared time-capture shapes*). */
export class TimeLogResponseDto {
  id: string;

  @ApiProperty({ type: String, format: "date" })
  workDate: string;

  durationMinutes: number;

  text: string;

  @ApiProperty({ type: String, nullable: true })
  title: string | null;

  @ApiProperty({ type: RefDto, nullable: true })
  project: RefDto | null;

  @ApiProperty({ type: RefDto, nullable: true })
  task: RefDto | null;

  excludeFromStats: boolean;
}
