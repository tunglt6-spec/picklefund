import {
  listSportPresets,
  getSportPreset,
  deriveParticipantModel,
  isImplementedCombo,
} from './sport-presets';

describe('sport-presets registry', () => {
  const EXPECTED_CODES = [
    'PICKLEBALL', 'TENNIS', 'BADMINTON', 'TABLE_TENNIS', 'FOOTBALL', 'BASKETBALL',
    'VOLLEYBALL', 'AIR_VOLLEYBALL', 'GOLF', 'RUNNING', 'CHESS', 'XIANGQI', 'BILLIARDS',
  ];

  it('có đủ 13 môn theo scope bắt buộc', () => {
    const codes = listSportPresets().map((p) => p.code);
    expect(codes).toEqual(expect.arrayContaining(EXPECTED_CODES));
    expect(codes).toHaveLength(13);
  });

  it('mỗi preset có tối thiểu 1 nội dung + 1 thể thức + metadata hợp lệ', () => {
    for (const p of listSportPresets()) {
      expect(p.competitions.length).toBeGreaterThanOrEqual(1);
      expect(p.formats.length).toBeGreaterThanOrEqual(1);
      expect(p.participantTypes.length).toBeGreaterThanOrEqual(1);
      expect(p.name).toBeTruthy();
      expect(p.resourceTerm).toBeTruthy();
      // dbScoringModel phải là 1 trong 2 giá trị DB hợp lệ
      expect(['HEAD_TO_HEAD', 'LEADERBOARD']).toContain(p.dbScoringModel);
    }
  });

  it('getSportPreset: known → preset, unknown → null', () => {
    expect(getSportPreset('PICKLEBALL')?.code).toBe('PICKLEBALL');
    expect(getSportPreset('KHONG_CO')).toBeNull();
    expect(getSportPreset(null)).toBeNull();
    expect(getSportPreset(undefined)).toBeNull();
  });

  it('deriveParticipantModel: map legacy đúng theo sport/format', () => {
    expect(deriveParticipantModel('FOOTBALL', 'GROUP_STAGE')).toEqual({ participantType: 'TEAM', partnerMode: null });
    expect(deriveParticipantModel('BASKETBALL', 'GROUP_STAGE')).toEqual({ participantType: 'TEAM', partnerMode: null });
    expect(deriveParticipantModel('GOLF', 'SINGLES')).toEqual({ participantType: 'INDIVIDUAL', partnerMode: null });
    expect(deriveParticipantModel('PICKLEBALL', 'RANDOM_DOUBLES')).toEqual({ participantType: 'PAIR', partnerMode: 'RANDOM' });
    expect(deriveParticipantModel('PICKLEBALL', 'FIXED_DOUBLES_ROUND_ROBIN')).toEqual({ participantType: 'PAIR', partnerMode: 'FIXED' });
    expect(deriveParticipantModel('PICKLEBALL', 'GROUP_STAGE')).toEqual({ participantType: 'INDIVIDUAL', partnerMode: null });
    expect(deriveParticipantModel('TENNIS', 'RANDOM_DOUBLES')).toEqual({ participantType: 'PAIR', partnerMode: 'RANDOM' });
  });

  it('isImplementedCombo: phản ánh đúng engine đã có/chưa (ranh giới trung thực)', () => {
    // Đã có engine thật
    expect(isImplementedCombo('PICKLEBALL', 'FIXED_DOUBLES_ROUND_ROBIN')).toBe(true);
    expect(isImplementedCombo('PICKLEBALL', 'GROUP_STAGE')).toBe(true);
    expect(isImplementedCombo('PICKLEBALL', 'RANDOM_DOUBLES')).toBe(true);
    expect(isImplementedCombo('FOOTBALL', 'GROUP_STAGE')).toBe(true);
    expect(isImplementedCombo('GOLF', 'SINGLES')).toBe(true);
    // M3: single-elimination nhóm vợt (dbFormat KNOCKOUT) đã có engine
    expect(isImplementedCombo('PICKLEBALL', 'KNOCKOUT')).toBe(true);
    expect(isImplementedCombo('TENNIS', 'KNOCKOUT')).toBe(true);
    // Chưa có engine (M2+) → phải là false để wizard không cho tạo invalid
    expect(isImplementedCombo('VOLLEYBALL', 'GROUP_STAGE')).toBe(false);
    expect(isImplementedCombo('CHESS', 'KNOCKOUT')).toBe(false);
    expect(isImplementedCombo('BILLIARDS', 'KNOCKOUT')).toBe(false);
    expect(isImplementedCombo('KHONG_CO', 'GROUP_STAGE')).toBe(false);
  });
});
