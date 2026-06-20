import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AttendanceService } from './attendance.service'
import { CurrentUser, Roles } from '../common/decorators'
import { ok } from '../common/response'

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.findAll(user.clubId, fundPeriodId))
  }

  @Post()
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async create(@CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.create(user.clubId, user.userId, body), 'Tạo buổi tập thành công')
  }

  @Get('my-sessions')
  async myAttendedSessions(@CurrentUser() user: any) {
    return ok(await this.service.findAttendedByMember(user.memberId, user.clubId))
  }

  @Get('member-summary')
  async memberSummary(@CurrentUser() user: any, @Query('fundPeriodId') fundPeriodId?: string) {
    return ok(await this.service.getMemberSummary(user.clubId, fundPeriodId))
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.findOne(id, user.clubId))
  }

  @Put(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return ok(await this.service.update(id, user.clubId, body))
  }

  @Delete(':id')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.delete(id, user.clubId), 'Xóa buổi chơi thành công')
  }

  @Get(':id/attendance')
  async getAttendance(@Param('id') id: string, @CurrentUser() user: any) {
    return ok(await this.service.getAttendance(id, user.clubId))
  }

  @Put(':id/attendance')
  @Roles('CLUB_ADMIN', 'CLUB_TREASURER')
  async updateAttendance(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { attendance: { memberId: string; status: 'PRESENT' | 'ABSENT' }[] }) {
    return ok(await this.service.updateAttendance(id, user.clubId, body.attendance), 'Cập nhật điểm danh thành công')
  }
}
