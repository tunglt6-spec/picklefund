import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CurrentUser } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import {
  CreateCommentDto,
  CreateMatchmakingDto,
  CreatePostDto,
  ReactionDto,
  UpdateCommentDto,
  UpdatePostDto,
} from './community.dto';

/**
 * Cộng đồng CLB (Member Experience v1). Mọi thao tác scope theo clubId/memberId từ JWT
 * (KHÔNG tin client). MEMBER_VIEW được vào nhờ allowlist '/community' trong MemberScopeGuard;
 * sửa/xóa chỉ nội dung của chính mình, kiểm duyệt (xóa nội dung người khác) cần role admin.
 */
@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private svc: CommunityService) {}

  private actor(user: JwtUser) {
    return {
      userId: user.userId,
      clubId: user.clubId as string,
      memberId: user.memberId,
      role: user.role,
    };
  }

  // ── Feed / Posts ──
  @Get('feed')
  async feed(
    @CurrentUser() user: JwtUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('sessionId') sessionId?: string,
    @Query('minigameId') minigameId?: string,
  ) {
    return ok(
      await this.svc.feed(this.actor(user), {
        cursor,
        limit: limit ? +limit : undefined,
        sessionId,
        minigameId,
      }),
    );
  }

  @Post('posts')
  async createPost(@CurrentUser() user: JwtUser, @Body() body: CreatePostDto) {
    return ok(await this.svc.createPost(this.actor(user), body), 'Đã đăng bài');
  }

  @Patch('posts/:id')
  async updatePost(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: UpdatePostDto,
  ) {
    return ok(await this.svc.updatePost(this.actor(user), id, body), 'Đã cập nhật');
  }

  @Delete('posts/:id')
  async deletePost(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.deletePost(this.actor(user), id), 'Đã xóa bài');
  }

  // ── Comments ──
  @Get('posts/:id/comments')
  async comments(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.listComments(this.actor(user), id));
  }

  @Post('posts/:id/comments')
  async addComment(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: CreateCommentDto,
  ) {
    return ok(
      await this.svc.createComment(this.actor(user), id, body),
      'Đã bình luận',
    );
  }

  @Patch('comments/:id')
  async updateComment(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: UpdateCommentDto,
  ) {
    return ok(await this.svc.updateComment(this.actor(user), id, body), 'Đã cập nhật');
  }

  @Delete('comments/:id')
  async deleteComment(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.deleteComment(this.actor(user), id), 'Đã xóa bình luận');
  }

  // ── Reactions ──
  @Put('reactions')
  async react(@CurrentUser() user: JwtUser, @Body() body: ReactionDto) {
    return ok(await this.svc.setReaction(this.actor(user), body));
  }

  // ── Members (mention picker) ──
  @Get('members')
  async members(@CurrentUser() user: JwtUser) {
    return ok(await this.svc.listMembers(user.clubId as string));
  }

  // ── Matchmaking (Tìm kèo) ──
  @Get('matchmaking')
  async matchmaking(@CurrentUser() user: JwtUser) {
    return ok(await this.svc.listMatchmaking(this.actor(user)));
  }

  @Post('matchmaking')
  async createMatchmaking(
    @CurrentUser() user: JwtUser,
    @Body() body: CreateMatchmakingDto,
  ) {
    return ok(await this.svc.createMatchmaking(this.actor(user), body), 'Đã tạo kèo');
  }

  @Post('matchmaking/:id/join')
  async joinMatchmaking(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.joinMatchmaking(this.actor(user), id), 'Đã tham gia kèo');
  }

  @Delete('matchmaking/:id/join')
  async leaveMatchmaking(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.leaveMatchmaking(this.actor(user), id), 'Đã rời kèo');
  }

  @Patch('matchmaking/:id/close')
  async closeMatchmaking(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return ok(await this.svc.closeMatchmaking(this.actor(user), id), 'Đã đóng kèo');
  }
}
