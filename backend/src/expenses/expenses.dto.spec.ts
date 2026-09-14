import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MiniExpenseType } from '@prisma/client';
import { CreateExpenseDto } from './expenses.dto';

/**
 * Khóa hợp đồng miniExpenseType giữa DTO ↔ Prisma enum ↔ FE.
 * Bug cũ: DTO hardcode ['PRIZE','EQUIPMENT',...] không khớp enum Prisma
 * (GAME_REWARD/TOURNAMENT_PRIZE/PARTY/BALL_PURCHASE/OTHER) → chi Quỹ Phụ báo
 * "miniExpenseType must be one of the following values". Test này chặn tái diễn.
 */
describe('CreateExpenseDto.miniExpenseType', () => {
  const base = {
    fundSource: 'MINI',
    description: 'Thưởng game buổi T7',
    amount: 200_000,
  };

  const errorsFor = async (over: Record<string, unknown>) => {
    const dto = plainToInstance(CreateExpenseDto, { ...base, ...over });
    const errors = await validate(dto);
    return errors.find((e) => e.property === 'miniExpenseType');
  };

  it('chấp nhận MỌI giá trị enum Prisma MiniExpenseType', async () => {
    for (const v of Object.values(MiniExpenseType)) {
      expect(await errorsFor({ miniExpenseType: v })).toBeUndefined();
    }
  });

  it('chấp nhận GAME_REWARD (giá trị FE gửi mặc định cho Quỹ Phụ)', async () => {
    expect(await errorsFor({ miniExpenseType: 'GAME_REWARD' })).toBeUndefined();
  });

  it('từ chối giá trị cũ đã lỗi thời (PRIZE)', async () => {
    expect(await errorsFor({ miniExpenseType: 'PRIZE' })).toBeDefined();
  });

  it('cho phép bỏ trống (optional)', async () => {
    expect(await errorsFor({})).toBeUndefined();
  });
});
