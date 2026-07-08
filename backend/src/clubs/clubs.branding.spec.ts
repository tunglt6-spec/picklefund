/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClubMemoryService } from '../ai/club-memory/club-memory.service';

const prisma = {
  club: { findUnique: jest.fn(), update: jest.fn() },
};

const mockClubMemory = {
  seedDefaultTemplate: jest.fn().mockResolvedValue({ created: 0, skipped: 0 }),
};

describe('ClubsService branding (EPIC10A)', () => {
  let service: ClubsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.club.update.mockImplementation(
      (arg: { data: Record<string, unknown> }) => Promise.resolve(arg),
    );
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ClubsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ClubMemoryService, useValue: mockClubMemory },
      ],
    }).compile();
    service = mod.get(ClubsService);
  });

  describe('getBranding fallback', () => {
    it('không có branding → fallback tên CLB + PickleFund defaults', async () => {
      prisma.club.findUnique.mockResolvedValue({
        name: 'CLB Hà Nội',
        logoUrl: null,
        settings: null,
      });
      const b = await service.getBranding('club-1');
      expect(b.displayName).toBe('CLB Hà Nội');
      expect(b.primaryColor).toBe('#6366F1');
      expect(b.secondaryColor).toBe('#06B6D4');
      expect(b.pdfFooter).toBe('PickleFund');
      expect(b.logoUrl).toBeNull();
      expect(b.shortName).toBeNull();
    });

    it('có branding lưu → ưu tiên giá trị branding', async () => {
      prisma.club.findUnique.mockResolvedValue({
        name: 'CLB Hà Nội',
        logoUrl: 'club-logo.png',
        settings: {
          branding: {
            displayName: 'Pickle Sài Gòn',
            primaryColor: '#FF0000',
            pdfFooter: 'CLB SG',
          },
        },
      });
      const b = await service.getBranding('club-1');
      expect(b.displayName).toBe('Pickle Sài Gòn');
      expect(b.primaryColor).toBe('#FF0000');
      expect(b.secondaryColor).toBe('#06B6D4'); // không set → default
      expect(b.pdfFooter).toBe('CLB SG');
      expect(b.logoUrl).toBe('club-logo.png');
    });

    it('club không tồn tại → NotFound', async () => {
      prisma.club.findUnique.mockResolvedValue(null);
      await expect(service.getBranding('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateBranding merge', () => {
    it('merge branding mới vào settings.branding, giữ settings khác + branding cũ', async () => {
      prisma.club.findUnique
        .mockResolvedValueOnce({
          settings: {
            name: 'x',
            branding: { displayName: 'Cũ', shortName: 'C' },
          },
        })
        // getBranding gọi lại sau update
        .mockResolvedValueOnce({
          name: 'CLB',
          logoUrl: null,
          settings: {
            name: 'x',
            branding: {
              displayName: 'Mới',
              shortName: 'C',
              primaryColor: '#123456',
            },
          },
        });
      await service.updateBranding('club-1', {
        displayName: 'Mới',
        primaryColor: '#123456',
      });
      const data = prisma.club.update.mock.calls[0][0].data as {
        settings: { name: string; branding: Record<string, unknown> };
      };
      // settings khác giữ nguyên
      expect(data.settings.name).toBe('x');
      // branding cũ (shortName) giữ, field mới ghi đè/thêm
      expect(data.settings.branding.shortName).toBe('C');
      expect(data.settings.branding.displayName).toBe('Mới');
      expect(data.settings.branding.primaryColor).toBe('#123456');
    });

    it('chỉ nhận key branding hợp lệ, bỏ qua key lạ', async () => {
      prisma.club.findUnique
        .mockResolvedValueOnce({ settings: {} })
        .mockResolvedValueOnce({ name: 'CLB', logoUrl: null, settings: {} });
      await service.updateBranding('club-1', {
        displayName: 'X',
        // @ts-expect-error key lạ không thuộc branding
        hacker: 'DROP',
      });
      const data = prisma.club.update.mock.calls[0][0].data as {
        settings: { branding: Record<string, unknown> };
      };
      expect(data.settings.branding.displayName).toBe('X');
      expect('hacker' in data.settings.branding).toBe(false);
    });
  });
});
