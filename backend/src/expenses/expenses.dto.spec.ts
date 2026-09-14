import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MiniExpenseType } from '@prisma/client';
import { CreateExpenseDto, UpdateExpenseDto } from './expenses.dto';

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

/**
 * UpdateExpenseDto phải chấp nhận các trường FE gửi khi SỬA (miniExpenseType/receiverName/
 * categoryId/notes…). Vì ValidationPipe bật forbidNonWhitelisted, thiếu trường nào → 400.
 * Bug cũ: sửa chi Quỹ Phụ hoặc chi có danh mục đều 400. Test này chặn tái diễn.
 */
describe('UpdateExpenseDto whitelist (sửa khoản chi)', () => {
  const propsPresent = async (over: Record<string, unknown>) => {
    const dto = plainToInstance(UpdateExpenseDto, over);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    return errors.map((e) => e.property);
  };

  it('chấp nhận payload sửa Quỹ Phụ (miniExpenseType + notes + receiverName)', async () => {
    const bad = await propsPresent({
      description: 'Sửa thưởng game',
      amount: 150_000,
      allocationRule: 'FUND_ONLY',
      miniExpenseType: 'GAME_REWARD',
      receiverName: 'Anh A',
      notes: 'ghi chú',
    });
    expect(bad).toEqual([]);
  });

  it('chấp nhận payload sửa Quỹ Chính có danh mục (categoryId)', async () => {
    const bad = await propsPresent({
      description: 'Sửa tiền sân',
      amount: 500_000,
      costType: 'COURT',
      categoryId: 'cat-1',
    });
    expect(bad).toEqual([]);
  });

  it('từ chối miniExpenseType lỗi thời (PRIZE) khi sửa', async () => {
    const dto = plainToInstance(UpdateExpenseDto, { miniExpenseType: 'PRIZE' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'miniExpenseType')).toBe(true);
  });
});
