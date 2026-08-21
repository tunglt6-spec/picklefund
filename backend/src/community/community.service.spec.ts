/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { HermesService } from '../hermes/hermes.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const prisma: any = {
  member: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  communityPost: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  communityComment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
  },
  communityReaction: {
    groupBy: jest.fn().mockResolvedValue([]),
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  matchmakingRequest: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  matchmakingParticipant: {
    create: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
};
const hermes = { dispatch: jest.fn().mockResolvedValue({ dispatched: 1 }) };
const audit = { log: jest.fn() };

const MEMBER = { id: 'mem-1', fullName: 'A', avatarUrl: null, userId: 'user-1' };
const ACTOR = { userId: 'user-1', clubId: 'club-1', memberId: 'mem-1', role: 'MEMBER_VIEW' };
const ADMIN = { userId: 'user-9', clubId: 'club-1', memberId: null, role: 'CLUB_ADMIN' };

describe('CommunityService', () => {
  let service: CommunityService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.communityReaction.groupBy.mockResolvedValue([]);
    prisma.communityReaction.findMany.mockResolvedValue([]);
    prisma.matchmakingParticipant.count.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: PrismaService, useValue: prisma },
        { provide: HermesService, useValue: hermes },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();
    service = module.get<CommunityService>(CommunityService);
  });

  describe('createPost', () => {
    it('member chưa liên kết (memberId null) → Forbidden', async () => {
      await expect(
        service.createPost({ ...ACTOR, memberId: null }, { body: 'hi' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sanitize: loại bỏ thẻ HTML/script khỏi body (chống XSS)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.communityPost.create.mockResolvedValue({
        id: 'p1', kind: 'GENERAL', body: 'hello', imageUrl: null, sessionId: null,
        minigameId: null, author: MEMBER, createdAt: new Date(), updatedAt: new Date(),
      });
      await service.createPost(ACTOR, { body: '<script>alert(1)</script>hello' });
      const arg = prisma.communityPost.create.mock.calls[0][0];
      expect(arg.data.body).not.toContain('<script>');
      expect(arg.data.body).toContain('hello');
      expect(arg.data.clubId).toBe('club-1');
      expect(arg.data.authorMemberId).toBe('mem-1');
    });
  });

  describe('setReaction', () => {
    it('emoji → upsert theo khóa unique (1 reaction / member / content)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1' });
      await service.setReaction(ACTOR, { targetType: 'POST', targetId: 'p1', emoji: 'HEART' });
      expect(prisma.communityReaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetType_targetId_memberId: { targetType: 'POST', targetId: 'p1', memberId: 'mem-1' } },
          update: { emoji: 'HEART' },
        }),
      );
    });

    it('emoji null → gỡ reaction (deleteMany)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1' });
      await service.setReaction(ACTOR, { targetType: 'POST', targetId: 'p1', emoji: null });
      expect(prisma.communityReaction.deleteMany).toHaveBeenCalled();
      expect(prisma.communityReaction.upsert).not.toHaveBeenCalled();
    });

    it('target khác club → NotFound (tenant isolation)', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.communityPost.findFirst.mockResolvedValue(null);
      await expect(
        service.setReaction(ACTOR, { targetType: 'POST', targetId: 'p-other', emoji: 'FIRE' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePost (moderation)', () => {
    it('không phải chủ + không phải admin → Forbidden', async () => {
      prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1', authorMemberId: 'someone-else' });
      await expect(service.deletePost(ACTOR, 'p1')).rejects.toThrow(ForbiddenException);
    });

    it('admin xóa bài người khác → soft delete + ghi audit', async () => {
      prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1', authorMemberId: 'mem-2' });
      prisma.communityPost.update.mockResolvedValue({});
      await service.deletePost(ADMIN, 'p1');
      expect(prisma.communityPost.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' }, data: { isDeleted: true } }),
      );
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('joinMatchmaking', () => {
    it('đủ người → chuyển status FULL', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.matchmakingRequest.findFirst
        .mockResolvedValueOnce({ id: 'mm1', clubId: 'club-1', status: 'OPEN', neededCount: 1, creatorMemberId: 'mem-2', creator: { id: 'mem-2', userId: 'user-2' } })
        .mockResolvedValueOnce({ id: 'mm1', clubId: 'club-1', status: 'FULL', neededCount: 1, creatorMemberId: 'mem-2', creator: { id: 'mem-2', fullName: 'B', avatarUrl: null }, participants: [{ memberId: 'mem-1', member: MEMBER }] });
      prisma.matchmakingParticipant.count.mockResolvedValue(1);
      await service.joinMatchmaking(ACTOR, 'mm1');
      expect(prisma.matchmakingRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'mm1' }, data: { status: 'FULL' } }),
      );
    });

    it('người tạo không tự tham gia kèo của mình', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.matchmakingRequest.findFirst.mockResolvedValue({ id: 'mm1', clubId: 'club-1', status: 'OPEN', neededCount: 2, creatorMemberId: 'mem-1', creator: { id: 'mem-1', userId: 'user-1' } });
      await expect(service.joinMatchmaking(ACTOR, 'mm1')).rejects.toThrow();
    });
  });

  describe('notifyMentions (qua createPost)', () => {
    it('chỉ mention member CÙNG CLB (validate DB), gửi thông báo', async () => {
      prisma.member.findFirst.mockResolvedValue(MEMBER);
      prisma.communityPost.create.mockResolvedValue({
        id: 'p1', kind: 'GENERAL', body: 'hi', imageUrl: null, sessionId: null,
        minigameId: null, author: MEMBER, createdAt: new Date(), updatedAt: new Date(),
      });
      prisma.member.findMany.mockResolvedValue([{ userId: 'user-2' }]);
      await service.createPost(ACTOR, { body: 'hi', mentions: ['mem-2'] });
      // validate mention theo clubId của actor
      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: 'club-1', isDeleted: false }) }),
      );
      expect(hermes.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'community_mention', targetUserId: 'user-2' }),
      );
    });
  });
});
