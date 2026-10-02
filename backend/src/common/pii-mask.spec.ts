import { of, lastValueFrom } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import {
  maskEmail,
  maskMemberPii,
  maskPhone,
  maskPiiDeep,
} from './pii-mask';
import { MemberPiiInterceptor } from './interceptors/member-pii.interceptor';

const viewer = { role: 'MEMBER_VIEW', userId: 'u1', memberId: 'm1' };
const other = {
  id: 'm2',
  userId: 'u2',
  fullName: 'B',
  phone: '0912345678',
  email: 'bob@gmail.com',
  notes: 'nợ xấu',
  skillLevel: 3,
};
const self = { ...other, id: 'm1', userId: 'u1' };

describe('maskPhone / maskEmail', () => {
  it('che SĐT các dạng', () => {
    expect(maskPhone('0912345678')).toBe('09******78');
    expect(maskPhone('+84912345678')).toBe('+8********78');
    expect(maskPhone('1234')).toBe('1***');
    expect(maskPhone('')).toBe('');
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });
  it('che email các dạng', () => {
    expect(maskEmail('abc@gmail.com')).toBe('a***@gmail.com');
    expect(maskEmail('x@y.vn')).toBe('x***@y.vn');
    expect(maskEmail('noat')).toBe('n***');
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBeNull();
  });
});

describe('maskMemberPii', () => {
  it('MEMBER_VIEW xem người khác → che, giữ shape', () => {
    const r = maskMemberPii(other, viewer);
    expect(r.phone).toBe('09******78');
    expect(r.email).toBe('b***@gmail.com');
    expect(r.notes).toBeNull();
    expect(r.fullName).toBe('B');
    expect(r.skillLevel).toBe(3);
    expect(other.phone).toBe('0912345678'); // không mutate
  });
  it('MEMBER_VIEW xem chính mình (theo memberId hoặc userId) → giữ nguyên', () => {
    expect(maskMemberPii(self, viewer).phone).toBe('0912345678');
    const byUser = { ...other, id: 'zz', userId: 'u1' };
    expect(maskMemberPii(byUser, viewer).email).toBe('bob@gmail.com');
  });
  it('role khác → trả nguyên object', () => {
    for (const role of ['CLUB_ADMIN', 'CLUB_TREASURER', 'SUPER_ADMIN']) {
      expect(maskMemberPii(other, { ...viewer, role })).toBe(other);
    }
    expect(maskMemberPii(other, null)).toBe(other);
  });
  it('luôn bỏ hash/loginName của người khác', () => {
    const r = maskMemberPii(
      { ...other, passwordHash: 'x', loginName: 'bob' } as any,
      viewer,
    );
    expect(r).not.toHaveProperty('passwordHash');
    expect(r).not.toHaveProperty('loginName');
  });
});

describe('maskPiiDeep', () => {
  it('che member lồng trong attendance record + mảng, giữ Date, không đụng object không phải member', () => {
    const d = new Date();
    const data = {
      success: true,
      data: {
        sessionDate: d,
        club: { name: 'CLB', phone: '0999999999', email: 'club@x.vn' },
        attendanceRecords: [{ id: 'r', member: other }, { id: 'r2', member: self }],
      },
    };
    const r: any = maskPiiDeep(data, viewer);
    expect(r.data.sessionDate).toBe(d);
    expect(r.data.club.phone).toBe('0999999999');
    expect(r.data.attendanceRecords[0].member.phone).toBe('09******78');
    expect(r.data.attendanceRecords[1].member.phone).toBe('0912345678');
  });
});

describe('MemberPiiInterceptor (members list)', () => {
  const run = async (user: any) => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of({ success: true, data: [other, self] }) };
    return lastValueFrom(new MemberPiiInterceptor().intercept(ctx, next)) as Promise<any>;
  };
  it('MEMBER_VIEW: người khác bị che, bản thân giữ', async () => {
    const r = await run(viewer);
    expect(r.data[0].phone).toBe('09******78');
    expect(r.data[1].phone).toBe('0912345678');
  });
  it.each(['CLUB_ADMIN', 'CLUB_TREASURER', 'SUPER_ADMIN'])(
    '%s: nguyên vẹn',
    async (role) => {
      const r = await run({ ...viewer, role });
      expect(r.data[0].phone).toBe('0912345678');
      expect(r.data[0].notes).toBe('nợ xấu');
    },
  );
});
