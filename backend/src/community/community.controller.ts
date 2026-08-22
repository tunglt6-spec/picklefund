import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  OnModuleInit,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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

const COMMUNITY_UPLOAD_DIR = join(process.cwd(), 'uploads', 'community');
const communityImageStorage = diskStorage({
  destination: COMMUNITY_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

/**
 * Cộng đồng CLB (Member Experience v1). Mọi thao tác scope theo clubId/memberId từ JWT
 * (KHÔNG tin client). MEMBER_VIEW được vào nhờ allowlist '/community' trong MemberScopeGuard;
 * sửa/xóa chỉ nội dung của chính mình, kiểm duyệt (xóa nội dung người khác) cần role admin.
 */
@ApiTags('Community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController implements OnModuleInit {
  constructor(private svc: CommunityService) {}

  onModuleInit() {
    if (!existsSync(COMMUNITY_UPLOAD_DIR)) mkdirSync(COMMUNITY_UPLOAD_DIR, { recursive: true });
  }

  /** Upload ảnh cho bài đăng — member được phép (allowlist '/community'). Trả URL tĩnh /uploads. */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: communityImageStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
        if (!allowed.test(extname(file.originalname))) {
          return cb(new BadRequestException('Chỉ chấp nhận ảnh jpg/png/webp/gif'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu tệp ảnh');
    return ok({ url: `/uploads/community/${file.filename}` });
  }

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
