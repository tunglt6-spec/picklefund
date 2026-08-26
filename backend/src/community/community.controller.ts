import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  OnModuleInit,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { LinkPreviewService } from './link-preview.service';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { JwtUser } from '../common/decorators';
import { ok } from '../common/response';
import {
  CreateCommentDto,
  CreateMatchmakingDto,
  CreatePostDto,
  ReactionDto,
  ReportDto,
  ResolveReportDto,
  UpdateCommentDto,
  UpdatePostDto,
} from './community.dto';

// F4: ảnh cộng đồng lưu thư mục RIÊNG theo CLB, KHÔNG phục vụ tĩnh — chỉ qua route ký HMAC.
const MEDIA_ROOT = join(process.cwd(), 'uploads_private', 'community');
const MEDIA_TTL_MS = 180 * 24 * 3600 * 1000; // link ảnh có hạn 180 ngày
const MEDIA_SECRET =
  process.env.MEDIA_SIGNING_SECRET || process.env.JWT_SECRET || 'pf-media-fallback-secret';
const CLUBID_RE = /^[A-Za-z0-9-]{1,64}$/;
const FILE_RE = /^[a-f0-9]{16,64}\.(jpg|jpeg|png|webp|gif)$/i;

function mediaSig(clubId: string, file: string, exp: number): string {
  return createHmac('sha256', MEDIA_SECRET).update(`${clubId}/${file}.${exp}`).digest('hex');
}
function signedMediaUrl(clubId: string, file: string): string {
  const exp = Date.now() + MEDIA_TTL_MS;
  const s = mediaSig(clubId, file, exp);
  return `/api/community/media/${clubId}/${file}?e=${exp}&s=${s}`;
}

// Lưu file vào uploads_private/community/<clubId>/<random>.<ext> (clubId từ JWT).
const communityImageStorage = diskStorage({
  destination: (req: any, _file, cb) => {
    const clubId = req?.user?.clubId;
    if (!clubId || !CLUBID_RE.test(clubId)) return cb(new ForbiddenException('Thiếu CLB'), '');
    const dir = join(MEDIA_ROOT, clubId);
    mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomBytes(16).toString('hex')}${extname(file.originalname).toLowerCase()}`);
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
  constructor(
    private svc: CommunityService,
    private linkPreview: LinkPreviewService,
  ) {}

  /** OpenGraph link-preview cho Cộng đồng CLB (card kiểu FB/Zalo). Fetch server-side + cache. */
  @Get('link-preview')
  async getLinkPreview(@Query('url') url: string) {
    return ok(await this.linkPreview.getPreview(url ?? ''));
  }

  onModuleInit() {
    if (!existsSync(MEDIA_ROOT)) mkdirSync(MEDIA_ROOT, { recursive: true });
  }

  /** Upload ảnh cho bài đăng — lưu theo CLB (từ JWT), trả URL ĐÃ KÝ (hạn 180 ngày). */
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
  uploadImage(@CurrentUser() user: JwtUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Thiếu tệp ảnh');
    return ok({ url: signedMediaUrl(user.clubId as string, file.filename) });
  }

  /**
   * F4: phục vụ ảnh cộng đồng qua route ký HMAC.
   * @Public vì thẻ <img> không gửi Bearer. Bảo mật dựa trên CHỮ KÝ URL:
   * link gắn clubId + hạn dùng + HMAC bí mật, KHÔNG đoán được và chỉ được phát ra cho
   * member của CLB (qua upload / feed đã scope theo clubId). Đây là điều kiện đủ để mọi
   * member cùng CLB xem được ảnh của nhau một cách ổn định trên <img> (không phụ thuộc
   * thời điểm set cookie — vốn gây 403 race khiến member khác không thấy ảnh).
   *
   * LƯU Ý: KHÔNG dùng cookie pf_media làm cổng chặn cứng ở đây. Thẻ <img> có thể tải ảnh
   * trước khi cookie phiên kịp được set (media-session chạy bất đồng bộ lúc mở app), dẫn tới
   * 403 và onError ẩn ảnh vĩnh viễn — đúng lỗi "member khác chỉ thấy bài, không thấy ảnh".
   */
  @Public()
  @Get('media/:clubId/:file')
  media(
    @Param('clubId') clubId: string,
    @Param('file') file: string,
    @Query('e') e: string,
    @Query('s') s: string,
    @Res() res: Response,
  ) {
    if (!CLUBID_RE.test(clubId) || !FILE_RE.test(file)) throw new NotFoundException();
    // Chữ ký URL (gắn clubId + hạn dùng + HMAC bí mật; chống đoán/sửa path/mượn link chéo CLB).
    const exp = Number(e);
    if (!exp || Date.now() > exp) throw new ForbiddenException('Link ảnh đã hết hạn');
    const expected = mediaSig(clubId, file, exp);
    const got = (s || '').toLowerCase();
    if (
      got.length !== expected.length ||
      !timingSafeEqual(Buffer.from(got), Buffer.from(expected))
    ) {
      throw new ForbiddenException('Chữ ký ảnh không hợp lệ');
    }
    const path = join(MEDIA_ROOT, clubId, file);
    if (!existsSync(path)) throw new NotFoundException();
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.sendFile(path);
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

  // ── Quản trị nội dung (report + duyệt) ──
  /** Member báo cáo (flag) bài/bình luận. */
  @Post('report')
  async report(@CurrentUser() user: JwtUser, @Body() body: ReportDto) {
    return ok(await this.svc.reportContent(this.actor(user), body), 'Đã gửi báo cáo');
  }

  /** Admin: danh sách báo cáo (queue duyệt). */
  @Get('reports')
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async reports(@CurrentUser() user: JwtUser, @Query('status') status?: string) {
    return ok(await this.svc.listReports(this.actor(user), status || 'OPEN'));
  }

  /** Admin: xử lý báo cáo (resolve + tùy chọn xóa nội dung, hoặc dismiss). */
  @Patch('reports/:id')
  @Roles('CLUB_ADMIN', 'SUPER_ADMIN')
  async resolveReport(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: ResolveReportDto,
  ) {
    return ok(
      await this.svc.resolveReport(this.actor(user), id, body.action, body.deleteContent ?? false),
      'Đã xử lý báo cáo',
    );
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
