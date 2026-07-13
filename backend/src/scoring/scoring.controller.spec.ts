import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ScoringController } from './scoring.controller';
import {
  AddScoreEventDto,
  CreateScoringRuleDto,
  UpdateScoringRuleDto,
} from './scoring.dto';
import type { JwtUser } from '../common/decorators';

const admin: JwtUser = {
  userId: 'u1',
  clubId: 'club-1',
  role: 'CLUB_ADMIN',
  username: 'admin',
  memberId: null,
};

describe('ScoringController (clubId từ JWT)', () => {
  let svc: Record<string, jest.Mock>;
  let ctrl: ScoringController;

  beforeEach(() => {
    svc = {
      listRules: jest.fn().mockResolvedValue([]),
      createRule: jest.fn().mockResolvedValue({ id: 'r1' }),
      updateRule: jest.fn().mockResolvedValue({ id: 'r1' }),
      deleteRule: jest.fn().mockResolvedValue({ deleted: true }),
      getPeriodScores: jest.fn().mockResolvedValue([]),
      getMemberDetail: jest.fn().mockResolvedValue({}),
      addManualEvent: jest.fn().mockResolvedValue({ id: 'ev1' }),
      removeEvent: jest.fn().mockResolvedValue({ deleted: true }),
      finalizePeriod: jest.fn().mockResolvedValue({ finalized: 3 }),
      seedDefaultRulesForAllClubs: jest
        .fn()
        .mockResolvedValue({ clubsProcessed: 1 }),
      currentPeriod: jest.fn().mockReturnValue('2026-07'),
    };
    ctrl = new ScoringController(svc as never);
  });

  it('listRules truyền clubId từ JWT', async () => {
    await ctrl.listRules(admin);
    expect(svc.listRules).toHaveBeenCalledWith('club-1');
  });

  it('createRule truyền clubId từ JWT', async () => {
    const dto = { category: 'BONUS', label: 'x', delta: 5 } as never;
    await ctrl.createRule(dto, admin);
    expect(svc.createRule).toHaveBeenCalledWith('club-1', dto);
  });

  it('addEvent truyền clubId + userId từ JWT', async () => {
    const dto = { memberId: 'm1', category: 'BONUS', label: 'x', delta: 5 } as never;
    await ctrl.addEvent(dto, admin);
    expect(svc.addManualEvent).toHaveBeenCalledWith('club-1', dto, 'u1');
  });

  describe('resolveMonth (query)', () => {
    it('không truyền month → dùng currentPeriod', async () => {
      await ctrl.period(undefined as never, admin);
      expect(svc.getPeriodScores).toHaveBeenCalledWith('club-1', '2026-07');
    });

    it('month hợp lệ → dùng month', async () => {
      await ctrl.period('2026-03', admin);
      expect(svc.getPeriodScores).toHaveBeenCalledWith('club-1', '2026-03');
    });

    it('month sai format → BadRequest', async () => {
      await expect(ctrl.period('2026/03' as never, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('finalize month sai format → BadRequest', async () => {
      await expect(ctrl.finalize('bad' as never, admin)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('@Roles metadata', () => {
    const reflector = new Reflector();
    it('seed-rules-all chỉ SUPER_ADMIN', () => {
      const roles = reflector.get<string[]>('roles', ctrl.seedRulesAll);
      expect(roles).toEqual(['SUPER_ADMIN']);
    });
    it('createRule chỉ CLUB_ADMIN', () => {
      const roles = reflector.get<string[]>('roles', ctrl.createRule);
      expect(roles).toEqual(['CLUB_ADMIN']);
    });
    it('listRules mở cho CLUB_ADMIN + CLUB_TREASURER + MEMBER_VIEW (chỉ xem)', () => {
      const roles = reflector.get<string[]>('roles', ctrl.listRules);
      expect(roles).toEqual(['CLUB_ADMIN', 'CLUB_TREASURER', 'MEMBER_VIEW']);
    });
    it('period + memberDetail (GET) mở cho MEMBER_VIEW (chỉ xem)', () => {
      expect(reflector.get<string[]>('roles', ctrl.period)).toEqual([
        'CLUB_ADMIN',
        'CLUB_TREASURER',
        'MEMBER_VIEW',
      ]);
      expect(reflector.get<string[]>('roles', ctrl.memberDetail)).toEqual([
        'CLUB_ADMIN',
        'CLUB_TREASURER',
        'MEMBER_VIEW',
      ]);
    });
    it('route ghi (finalize/addEvent/removeEvent) KHÔNG mở cho MEMBER_VIEW', () => {
      for (const h of [ctrl.finalize, ctrl.addEvent, ctrl.removeEvent]) {
        expect(reflector.get<string[]>('roles', h)).not.toContain('MEMBER_VIEW');
      }
    });
  });
});

describe('Scoring DTO validation', () => {
  it('CreateScoringRuleDto: category lạ → lỗi', () => {
    const dto = plainToInstance(CreateScoringRuleDto, {
      category: 'HACK',
      label: 'x',
      delta: 5,
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('CreateScoringRuleDto: delta ngoài range → lỗi', () => {
    const dto = plainToInstance(CreateScoringRuleDto, {
      category: 'BONUS',
      label: 'x',
      delta: 999,
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('CreateScoringRuleDto: label rỗng → lỗi', () => {
    const dto = plainToInstance(CreateScoringRuleDto, {
      category: 'BONUS',
      label: '',
      delta: 5,
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('CreateScoringRuleDto: hợp lệ → không lỗi', () => {
    const dto = plainToInstance(CreateScoringRuleDto, {
      category: 'CONDUCT',
      label: 'Fair play',
      delta: 3,
    });
    expect(validateSync(dto).length).toBe(0);
  });

  it('UpdateScoringRuleDto: delta ngoài range → lỗi', () => {
    const dto = plainToInstance(UpdateScoringRuleDto, { delta: -500 });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('AddScoreEventDto: month sai format → lỗi', () => {
    const dto = plainToInstance(AddScoreEventDto, {
      memberId: 'm1',
      periodMonth: '2026/07',
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('AddScoreEventDto: month đúng format → không lỗi', () => {
    const dto = plainToInstance(AddScoreEventDto, {
      memberId: 'm1',
      periodMonth: '2026-07',
    });
    expect(validateSync(dto).length).toBe(0);
  });
});
