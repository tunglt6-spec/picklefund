import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type {
  CreateCommentDto,
  CreateMatchmakingDto,
  CreatePostDto,
  Emoji,
  ReactionDto,
  ReactionTarget,
  UpdateCommentDto,
  UpdatePostDto,
} from './community.dto';

/** Diễn viên (actor) suy từ JWT — KHÔNG tin client. */
interface Actor {
  userId: string;
  clubId: string;
  memberId: string | null;
  role: string;
}

/** Loại bỏ thẻ HTML/script để chống XSS khi lưu (frontend cũng render dạng text). */
function sanitize(s: string): string {
  return (s ?? "").replace(/<[^>]*>/g, "").trim();
}

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private hermes: HermesService,
    private audit: AuditLogsService,
  ) {}

  private isAdmin(role: string): boolean {
    return role === 'CLUB_ADMIN' || role === 'SUPER_ADMIN';
  }

  /** Bảo đảm actor là member hợp lệ của club (bắt buộc cho hành động tạo nội dung). */
  private async requireMember(actor: Actor) {
    if (!actor.memberId)
      throw new ForbiddenException('Tài khoản chưa liên kết thành viên.');
    const m = await this.prisma.member.findFirst({
      where: { id: actor.memberId, clubId: actor.clubId, isDeleted: false },
      select: { id: true, fullName: true, avatarUrl: true, userId: true },
    });
    if (!m) throw new NotFoundException('Không tìm thấy thành viên.');
    return m;
  }

  // ─── Members (cho @mention picker) ──────────────────────────────────────────

  async listMembers(clubId: string) {
    const rows = await this.prisma.member.findMany({
      where: { clubId, isDeleted: false, status: 'active' },
      select: { id: true, fullName: true, avatarUrl: true },
      orderBy: { fullName: 'asc' },
      take: 500,
    });
    return rows;
  }

  // ─── Reactions summary ──────────────────────────────────────────────────────

  private async reactionSummary(
    clubId: string,
    targetType: ReactionTarget,
    ids: string[],
    myMemberId: string | null,
  ): Promise<Record<string, { counts: Record<string, number>; mine: Emoji | null; total: number }>> {
    const out: Record<string, { counts: Record<string, number>; mine: Emoji | null; total: number }> = {};
    if (!ids.length) return out;
    for (const id of ids)
      out[id] = { counts: { THUMBS_UP: 0, HEART: 0, CLAP: 0, FIRE: 0 }, mine: null, total: 0 };

    const grouped = await this.prisma.communityReaction.groupBy({
      by: ['targetId', 'emoji'],
      where: { clubId, targetType, targetId: { in: ids } },
      _count: { _all: true },
    });
    for (const g of grouped) {
      const bucket = out[g.targetId];
      if (!bucket) continue;
      bucket.counts[g.emoji] = g._count._all;
      bucket.total += g._count._all;
    }
    if (myMemberId) {
      const mine = await this.prisma.communityReaction.findMany({
        where: { clubId, targetType, targetId: { in: ids }, memberId: myMemberId },
        select: { targetId: true, emoji: true },
      });
      for (const r of mine) if (out[r.targetId]) out[r.targetId].mine = r.emoji;
    }
    return out;
  }

  // ─── Feed / Posts ───────────────────────────────────────────────────────────

  async feed(
    actor: Actor,
    opts: { cursor?: string; limit?: number; sessionId?: string; minigameId?: string },
  ) {
    const take = Math.min(30, Math.max(1, opts.limit ?? 15));
    const where: any = { clubId: actor.clubId, isDeleted: false };
    if (opts.sessionId) where.sessionId = opts.sessionId;
    if (opts.minigameId) where.minigameId = opts.minigameId;

    const rows = await this.prisma.communityPost.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { comments: { where: { isDeleted: false } } } },
      },
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const ids = page.map((p) => p.id);
    const reactions = await this.reactionSummary(actor.clubId, 'POST', ids, actor.memberId);

    return {
      items: page.map((p) => ({
        id: p.id,
        kind: p.kind,
        body: p.body,
        imageUrl: p.imageUrl,
        sessionId: p.sessionId,
        minigameId: p.minigameId,
        author: p.author,
        commentCount: p._count.comments,
        reactions: reactions[p.id],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        canEdit: !!actor.memberId && p.authorMemberId === actor.memberId,
        canDelete:
          this.isAdmin(actor.role) ||
          (!!actor.memberId && p.authorMemberId === actor.memberId),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async createPost(actor: Actor, dto: CreatePostDto) {
    const me = await this.requireMember(actor);
    const body = sanitize(dto.body);
    if (!body) throw new BadRequestException('Nội dung không được để trống.');

    const post = await this.prisma.communityPost.create({
      data: {
        clubId: actor.clubId,
        authorMemberId: me.id,
        kind: (dto.kind ?? 'GENERAL') as any,
        body,
        imageUrl: dto.imageUrl?.trim() || null,
        sessionId: dto.sessionId || null,
        minigameId: dto.minigameId || null,
      },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    await this.notifyMentions(actor, me.fullName, dto.mentions, {
      link: `/community?post=${post.id}`,
      context: 'bài viết',
    });

    return {
      id: post.id,
      kind: post.kind,
      body: post.body,
      imageUrl: post.imageUrl,
      sessionId: post.sessionId,
      minigameId: post.minigameId,
      author: post.author,
      commentCount: 0,
      reactions: { counts: { THUMBS_UP: 0, HEART: 0, CLAP: 0, FIRE: 0 }, mine: null, total: 0 },
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      canEdit: true,
      canDelete: true,
    };
  }

  async updatePost(actor: Actor, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, clubId: actor.clubId, isDeleted: false },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết.');
    if (post.authorMemberId !== actor.memberId)
      throw new ForbiddenException('Chỉ sửa được bài của chính mình.');
    const body = sanitize(dto.body);
    if (!body) throw new BadRequestException('Nội dung không được để trống.');
    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { body, imageUrl: dto.imageUrl?.trim() ?? post.imageUrl },
      select: { id: true, body: true, imageUrl: true, updatedAt: true },
    });
  }

  async deletePost(actor: Actor, postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, clubId: actor.clubId, isDeleted: false },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết.');
    const isOwner = post.authorMemberId === actor.memberId;
    if (!isOwner && !this.isAdmin(actor.role))
      throw new ForbiddenException('Không có quyền xóa bài viết này.');
    await this.prisma.communityPost.update({
      where: { id: postId },
      data: { isDeleted: true },
    });
    if (!isOwner) {
      void this.audit.log({
        userId: actor.userId,
        clubId: actor.clubId,
        action: 'MODERATE_DELETE',
        resource: 'CommunityPost',
        resourceId: postId,
        detail: 'Admin xóa bài viết cộng đồng',
      });
    }
    return { id: postId, deleted: true };
  }

  // ─── Comments ───────────────────────────────────────────────────────────────

  async listComments(actor: Actor, postId: string) {
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, clubId: actor.clubId, isDeleted: false },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết.');
    const rows = await this.prisma.communityComment.findMany({
      where: { postId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
      take: 500,
    });
    const ids = rows.map((c) => c.id);
    const reactions = await this.reactionSummary(actor.clubId, 'COMMENT', ids, actor.memberId);
    return rows.map((c) => ({
      id: c.id,
      body: c.body,
      author: c.author,
      reactions: reactions[c.id],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      canEdit: !!actor.memberId && c.authorMemberId === actor.memberId,
      canDelete:
        this.isAdmin(actor.role) ||
        (!!actor.memberId && c.authorMemberId === actor.memberId),
    }));
  }

  async createComment(actor: Actor, postId: string, dto: CreateCommentDto) {
    const me = await this.requireMember(actor);
    const post = await this.prisma.communityPost.findFirst({
      where: { id: postId, clubId: actor.clubId, isDeleted: false },
      include: { author: { select: { id: true, userId: true } } },
    });
    if (!post) throw new NotFoundException('Không tìm thấy bài viết.');
    const body = sanitize(dto.body);
    if (!body) throw new BadRequestException('Nội dung không được để trống.');

    const comment = await this.prisma.communityComment.create({
      data: {
        clubId: actor.clubId,
        postId,
        authorMemberId: me.id,
        body,
      },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    // Thông báo cho tác giả bài viết (nếu không phải chính mình).
    if (post.author?.userId && post.authorMemberId !== me.id) {
      await this.hermes
        .dispatch({
          eventType: 'community_reply',
          clubId: actor.clubId,
          targetUserId: post.author.userId,
          title: 'Có phản hồi mới',
          body: `${me.fullName} đã bình luận vào bài viết của bạn.`,
          metadata: { link: `/community?post=${postId}`, postId },
        })
        .catch(() => undefined);
    }
    await this.notifyMentions(actor, me.fullName, dto.mentions, {
      link: `/community?post=${postId}`,
      context: 'bình luận',
    });

    return {
      id: comment.id,
      body: comment.body,
      author: comment.author,
      reactions: { counts: { THUMBS_UP: 0, HEART: 0, CLAP: 0, FIRE: 0 }, mine: null, total: 0 },
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canEdit: true,
      canDelete: true,
    };
  }

  async updateComment(actor: Actor, commentId: string, dto: UpdateCommentDto) {
    const c = await this.prisma.communityComment.findFirst({
      where: { id: commentId, clubId: actor.clubId, isDeleted: false },
    });
    if (!c) throw new NotFoundException('Không tìm thấy bình luận.');
    if (c.authorMemberId !== actor.memberId)
      throw new ForbiddenException('Chỉ sửa được bình luận của chính mình.');
    const body = sanitize(dto.body);
    if (!body) throw new BadRequestException('Nội dung không được để trống.');
    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { body },
      select: { id: true, body: true, updatedAt: true },
    });
  }

  async deleteComment(actor: Actor, commentId: string) {
    const c = await this.prisma.communityComment.findFirst({
      where: { id: commentId, clubId: actor.clubId, isDeleted: false },
    });
    if (!c) throw new NotFoundException('Không tìm thấy bình luận.');
    const isOwner = c.authorMemberId === actor.memberId;
    if (!isOwner && !this.isAdmin(actor.role))
      throw new ForbiddenException('Không có quyền xóa bình luận này.');
    await this.prisma.communityComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
    if (!isOwner) {
      void this.audit.log({
        userId: actor.userId,
        clubId: actor.clubId,
        action: 'MODERATE_DELETE',
        resource: 'CommunityComment',
        resourceId: commentId,
        detail: 'Admin xóa bình luận cộng đồng',
      });
    }
    return { id: commentId, deleted: true };
  }

  // ─── Reactions ──────────────────────────────────────────────────────────────

  async setReaction(actor: Actor, dto: ReactionDto) {
    const me = await this.requireMember(actor);
    // Xác thực target thuộc đúng club (chống cross-tenant).
    if (dto.targetType === 'POST') {
      const p = await this.prisma.communityPost.findFirst({
        where: { id: dto.targetId, clubId: actor.clubId, isDeleted: false },
        select: { id: true },
      });
      if (!p) throw new NotFoundException('Không tìm thấy bài viết.');
    } else {
      const c = await this.prisma.communityComment.findFirst({
        where: { id: dto.targetId, clubId: actor.clubId, isDeleted: false },
        select: { id: true },
      });
      if (!c) throw new NotFoundException('Không tìm thấy bình luận.');
    }

    const key = {
      targetType_targetId_memberId: {
        targetType: dto.targetType as any,
        targetId: dto.targetId,
        memberId: me.id,
      },
    };

    if (!dto.emoji) {
      // Bỏ reaction (idempotent).
      await this.prisma.communityReaction.deleteMany({
        where: { targetType: dto.targetType as any, targetId: dto.targetId, memberId: me.id },
      });
    } else {
      // Đặt/đổi reaction — unique chống ghi trùng 1 user/1 content.
      await this.prisma.communityReaction.upsert({
        where: key,
        create: {
          clubId: actor.clubId,
          targetType: dto.targetType as any,
          targetId: dto.targetId,
          memberId: me.id,
          emoji: dto.emoji as any,
        },
        update: { emoji: dto.emoji as any },
      });
    }
    const summary = await this.reactionSummary(actor.clubId, dto.targetType, [dto.targetId], me.id);
    return summary[dto.targetId];
  }

  // ─── @mention notify ────────────────────────────────────────────────────────

  private async notifyMentions(
    actor: Actor,
    actorName: string,
    mentionIds: string[] | undefined,
    opts: { link: string; context: string },
  ) {
    if (!mentionIds?.length) return;
    const unique = [...new Set(mentionIds)].filter((id) => id !== actor.memberId);
    if (!unique.length) return;
    // CHỈ mention member cùng CLB (validate với DB) — không cho mention CLB khác.
    const members = await this.prisma.member.findMany({
      where: { id: { in: unique }, clubId: actor.clubId, isDeleted: false },
      select: { userId: true },
    });
    for (const m of members) {
      if (!m.userId) continue;
      await this.hermes
        .dispatch({
          eventType: 'community_mention',
          clubId: actor.clubId,
          targetUserId: m.userId,
          title: 'Bạn được nhắc tên',
          body: `${actorName} đã nhắc bạn trong một ${opts.context}.`,
          metadata: { link: opts.link },
        })
        .catch(() => undefined);
    }
  }

  // ─── Matchmaking (Tìm kèo) ──────────────────────────────────────────────────

  async listMatchmaking(actor: Actor) {
    const rows = await this.prisma.matchmakingRequest.findMany({
      where: { clubId: actor.clubId, status: { in: ['OPEN', 'FULL'] } },
      orderBy: [{ playDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          include: { member: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
      take: 100,
    });
    return rows.map((r) => this.mapMatchmaking(r, actor.memberId));
  }

  private mapMatchmaking(r: any, myMemberId: string | null) {
    const joinedCount = r.participants.length;
    return {
      id: r.id,
      sport: r.sport,
      playDate: r.playDate,
      startTime: r.startTime,
      endTime: r.endTime,
      format: r.format,
      neededCount: r.neededCount,
      skillLevel: r.skillLevel,
      note: r.note,
      status: r.status,
      creator: r.creator,
      joinedCount,
      remaining: Math.max(0, r.neededCount - joinedCount),
      participants: r.participants.map((p: any) => p.member),
      isCreator: !!myMemberId && r.creatorMemberId === myMemberId,
      isJoined:
        !!myMemberId && r.participants.some((p: any) => p.memberId === myMemberId),
    };
  }

  async createMatchmaking(actor: Actor, dto: CreateMatchmakingDto) {
    const me = await this.requireMember(actor);
    const r = await this.prisma.matchmakingRequest.create({
      data: {
        clubId: actor.clubId,
        creatorMemberId: me.id,
        sport: sanitize(dto.sport).slice(0, 40),
        playDate: new Date(dto.playDate),
        startTime: dto.startTime || null,
        endTime: dto.endTime || null,
        format: dto.format ? sanitize(dto.format).slice(0, 40) : null,
        neededCount: dto.neededCount,
        skillLevel: dto.skillLevel ?? null,
        note: dto.note ? sanitize(dto.note).slice(0, 500) : null,
      },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          include: { member: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
    return this.mapMatchmaking(r, me.id);
  }

  async joinMatchmaking(actor: Actor, requestId: string) {
    const me = await this.requireMember(actor);
    const req = await this.prisma.matchmakingRequest.findFirst({
      where: { id: requestId, clubId: actor.clubId },
      include: { creator: { select: { id: true, userId: true } } },
    });
    if (!req) throw new NotFoundException('Không tìm thấy kèo.');
    if (req.status === 'CLOSED' || req.status === 'CANCELLED')
      throw new BadRequestException('Kèo đã đóng.');
    if (req.status === 'FULL')
      throw new BadRequestException('Kèo đã đủ người.');
    if (req.creatorMemberId === me.id)
      throw new BadRequestException('Bạn là người tạo kèo này.');

    try {
      await this.prisma.matchmakingParticipant.create({
        data: { clubId: actor.clubId, requestId, memberId: me.id },
      });
    } catch (e: any) {
      // Unique → đã tham gia (idempotent).
      if (e?.code !== 'P2002') throw e;
    }

    const count = await this.prisma.matchmakingParticipant.count({ where: { requestId } });
    if (count >= req.neededCount && req.status === 'OPEN') {
      await this.prisma.matchmakingRequest.update({
        where: { id: requestId },
        data: { status: 'FULL' },
      });
    }

    // Thông báo người tạo kèo.
    if (req.creator?.userId && req.creatorMemberId !== me.id) {
      await this.hermes
        .dispatch({
          eventType: 'matchmaking_joined',
          clubId: actor.clubId,
          targetUserId: req.creator.userId,
          title: 'Có người tham gia kèo',
          body: `${me.fullName} đã tham gia kèo ${req.sport} của bạn.`,
          metadata: { link: `/community?tab=matchmaking`, requestId },
        })
        .catch(() => undefined);
    }

    const fresh = await this.prisma.matchmakingRequest.findFirst({
      where: { id: requestId },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          include: { member: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
    return this.mapMatchmaking(fresh, me.id);
  }

  async leaveMatchmaking(actor: Actor, requestId: string) {
    const me = await this.requireMember(actor);
    const req = await this.prisma.matchmakingRequest.findFirst({
      where: { id: requestId, clubId: actor.clubId },
    });
    if (!req) throw new NotFoundException('Không tìm thấy kèo.');
    await this.prisma.matchmakingParticipant.deleteMany({
      where: { requestId, memberId: me.id },
    });
    const count = await this.prisma.matchmakingParticipant.count({ where: { requestId } });
    if (count < req.neededCount && req.status === 'FULL') {
      await this.prisma.matchmakingRequest.update({
        where: { id: requestId },
        data: { status: 'OPEN' },
      });
    }
    const fresh = await this.prisma.matchmakingRequest.findFirst({
      where: { id: requestId },
      include: {
        creator: { select: { id: true, fullName: true, avatarUrl: true } },
        participants: {
          include: { member: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
      },
    });
    return this.mapMatchmaking(fresh, me.id);
  }

  async closeMatchmaking(actor: Actor, requestId: string) {
    const req = await this.prisma.matchmakingRequest.findFirst({
      where: { id: requestId, clubId: actor.clubId },
    });
    if (!req) throw new NotFoundException('Không tìm thấy kèo.');
    const isOwner = req.creatorMemberId === actor.memberId;
    if (!isOwner && !this.isAdmin(actor.role))
      throw new ForbiddenException('Chỉ người tạo hoặc quản trị được đóng kèo.');
    await this.prisma.matchmakingRequest.update({
      where: { id: requestId },
      data: { status: 'CLOSED' },
    });
    return { id: requestId, status: 'CLOSED' };
  }
}
