/**
 * SPORT PRESET REGISTRY — nguồn sự thật (config-driven) cho Sports Tournament Engine.
 *
 * Nguyên tắc: Tournament Core KHÔNG hard-code theo môn. Mỗi môn khai báo ở đây preset gồm:
 * participant types, nội dung thi đấu (competitions), thể thức (formats), scoring model, luật
 * mặc định, thuật ngữ sân bãi. Thêm môn mới = thêm 1 SportPreset (+ engine nếu format mới),
 * KHÔNG sửa Tournament Core.
 *
 * Ranh giới trung thực: mỗi format mang cờ `implemented` phản ánh ĐÚNG engine backend đã có
 * thật hay chưa. Wizard chỉ cho TẠO với tổ hợp (sport, format) implemented=true → không sinh
 * tournament invalid. Các mục chưa có engine hiển thị "sắp có" (M2+ sẽ bật khi engine hoàn tất).
 *
 * Mapping xuống DB: `MinigameFormat` (enum hiện hữu) + `Minigame.sport` (string) + `scoringModel`.
 * KHÔNG đổi schema enum trong M1 — các format khái niệm map về giá trị enum đang chạy được.
 */
import { MinigameFormat } from '@prisma/client';

export type ParticipantType = 'INDIVIDUAL' | 'PAIR' | 'TEAM';
export type PartnerMode = 'FIXED' | 'ROTATING' | 'RANDOM';
export type ScoringModelKind =
  | 'POINT_BASED'
  | 'SET_BASED'
  | 'GOAL_BASED'
  | 'TIME_BASED'
  | 'STROKE_BASED'
  | 'RANK_BASED';

/** Thể thức khái niệm (vocabulary tổng quát của engine, độc lập giá trị enum DB). */
export type FormatCode =
  | 'ROUND_ROBIN'
  | 'GROUP_KNOCKOUT'
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'LEAGUE'
  | 'AMERICANO'
  | 'MEXICANO'
  | 'GOLF_STROKE_PLAY'
  | 'GOLF_STABLEFORD'
  | 'GOLF_MATCH_PLAY';

export interface CompetitionDef {
  code: string; // MEN_SINGLES, MIXED_DOUBLES, TEAM, OPEN...
  label: string; // "Đơn nam", "Đôi nam nữ", "Đội"...
  participantType: ParticipantType;
  partnerModes?: PartnerMode[]; // chỉ với PAIR
}

export interface FormatDef {
  code: FormatCode;
  label: string;
  sub?: string;
  /** Map xuống MinigameFormat enum hiện hữu (giá trị đang có engine chạy). */
  dbFormat: MinigameFormat;
  /** Engine backend đã tồn tại & chạy thật cho tổ hợp này chưa. */
  implemented: boolean;
  /** Ghi chú lộ trình khi chưa implemented. */
  note?: string;
}

export interface MatchRuleField {
  key: string;
  label: string;
  type: 'int' | 'select' | 'bool';
  default: number | string | boolean;
  options?: Array<{ value: number | string; label: string }>;
  min?: number;
  max?: number;
}

export interface SportPreset {
  code: string; // PICKLEBALL, TENNIS, ...
  name: string;
  icon: string; // emoji
  participantTypes: ParticipantType[];
  competitions: CompetitionDef[];
  formats: FormatDef[];
  scoringModels: ScoringModelKind[];
  /** scoringModel lưu DB (HEAD_TO_HEAD | LEADERBOARD) mặc định cho môn này. */
  dbScoringModel: 'HEAD_TO_HEAD' | 'LEADERBOARD';
  /** Thuật ngữ tài nguyên thi đấu hiển thị UI. */
  resourceTerm: string; // "Sân", "Bàn", "Đường chạy", "Tee time"...
  matchRules: MatchRuleField[];
  /** Cả môn đã có engine chạy thật ở mức cơ bản chưa (ảnh hưởng cờ "sắp có" trên UI). */
  implemented: boolean;
}

// ── Preset builders dùng lại ────────────────────────────────────────────────
const RACKET_COMPETITIONS: CompetitionDef[] = [
  { code: 'MEN_SINGLES', label: 'Đơn nam', participantType: 'INDIVIDUAL' },
  { code: 'WOMEN_SINGLES', label: 'Đơn nữ', participantType: 'INDIVIDUAL' },
  { code: 'MEN_DOUBLES', label: 'Đôi nam', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM', 'ROTATING'] },
  { code: 'WOMEN_DOUBLES', label: 'Đôi nữ', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM', 'ROTATING'] },
  { code: 'MIXED_DOUBLES', label: 'Đôi nam nữ', participantType: 'PAIR', partnerModes: ['FIXED', 'RANDOM', 'ROTATING'] },
];

/** Thể thức nhóm vợt kiểu-Pickleball đang chạy thật (map về enum DB hiện hữu). */
const RACKET_FORMATS_LIVE: FormatDef[] = [
  { code: 'ROUND_ROBIN', label: 'Vòng tròn (đôi cố định)', sub: 'Fixed Doubles Round Robin', dbFormat: 'FIXED_DOUBLES_ROUND_ROBIN', implemented: true },
  { code: 'GROUP_KNOCKOUT', label: 'Vòng bảng', sub: 'Group Stage — 1v1 theo bảng', dbFormat: 'GROUP_STAGE', implemented: true },
];
/** Random-doubles (rotating partner) — engine draw-round đã có thật. */
const RACKET_RANDOM: FormatDef = {
  code: 'AMERICANO', label: 'Đánh đôi ngẫu nhiên', sub: 'Random Doubles — 2v2 mỗi vòng đổi cặp', dbFormat: 'RANDOM_DOUBLES', implemented: true,
};
/** Các thể thức nhóm vợt sẽ bật ở M2+ (engine chưa có). */
const RACKET_FORMATS_PLANNED: FormatDef[] = [
  { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Single Elimination — nhánh loại trực tiếp (đơn)', dbFormat: 'KNOCKOUT', implemented: true },
  { code: 'DOUBLE_ELIMINATION', label: 'Loại kép', sub: 'Double Elimination', dbFormat: 'KNOCKOUT', implemented: false, note: 'Sắp có (M4)' },
  { code: 'LEAGUE', label: 'League (đôi cố định)', sub: 'Vòng tròn lượt đi/lượt về', dbFormat: 'FIXED_DOUBLES_ROUND_ROBIN', implemented: true },
  { code: 'MEXICANO', label: 'Mexicano', sub: 'Ghép cặp theo BXH mỗi vòng', dbFormat: 'RANDOM_DOUBLES', implemented: false, note: 'Sắp có (M5)' },
];

const RACKET_RULES: MatchRuleField[] = [
  { key: 'pointsToWin', label: 'Điểm mỗi ván', type: 'select', default: 11, options: [{ value: 11, label: '11' }, { value: 15, label: '15' }, { value: 21, label: '21' }] },
  { key: 'winBy2', label: 'Cách biệt 2 điểm', type: 'bool', default: true },
  { key: 'bestOf', label: 'Số ván (Best of)', type: 'select', default: 1, options: [{ value: 1, label: 'Best of 1' }, { value: 3, label: 'Best of 3' }, { value: 5, label: 'Best of 5' }] },
];

function racketPreset(code: string, name: string, icon: string): SportPreset {
  return {
    code, name, icon,
    participantTypes: ['INDIVIDUAL', 'PAIR'],
    competitions: RACKET_COMPETITIONS,
    formats: [RACKET_RANDOM, ...RACKET_FORMATS_LIVE, ...RACKET_FORMATS_PLANNED],
    scoringModels: ['POINT_BASED', 'SET_BASED'],
    dbScoringModel: 'HEAD_TO_HEAD',
    resourceTerm: 'Sân',
    matchRules: RACKET_RULES,
    implemented: true,
  };
}

const TEAM_FORMATS_LIVE: FormatDef[] = [
  { code: 'ROUND_ROBIN', label: 'Vòng tròn', sub: 'Round Robin — mỗi đội gặp nhau', dbFormat: 'GROUP_STAGE', implemented: true },
  { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Knockout', dbFormat: 'GROUP_STAGE', implemented: true },
];
const TEAM_FORMATS_PLANNED: FormatDef[] = [
  { code: 'GROUP_KNOCKOUT', label: 'Vòng bảng + loại trực tiếp', sub: 'Group + Knockout', dbFormat: 'GROUP_STAGE', implemented: false, note: 'Sắp có — tự nối bảng sang bracket' },
  { code: 'LEAGUE', label: 'League', sub: 'Vòng tròn lượt đi/lượt về', dbFormat: 'GROUP_STAGE', implemented: true },
];

// ── REGISTRY 13 môn ─────────────────────────────────────────────────────────
const PRESETS: SportPreset[] = [
  racketPreset('PICKLEBALL', 'Pickleball', '🏓'),
  racketPreset('TENNIS', 'Tennis', '🎾'),
  racketPreset('BADMINTON', 'Cầu lông', '🏸'),
  racketPreset('TABLE_TENNIS', 'Bóng bàn', '🏓'),
  {
    code: 'FOOTBALL', name: 'Bóng đá', icon: '⚽',
    participantTypes: ['TEAM'],
    competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }],
    formats: [...TEAM_FORMATS_LIVE, ...TEAM_FORMATS_PLANNED],
    scoringModels: ['GOAL_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Sân',
    matchRules: [
      { key: 'winPoints', label: 'Điểm thắng', type: 'int', default: 3, min: 0, max: 10 },
      { key: 'drawPoints', label: 'Điểm hòa', type: 'int', default: 1, min: 0, max: 10 },
      { key: 'lossPoints', label: 'Điểm thua', type: 'int', default: 0, min: 0, max: 10 },
      { key: 'allowDraw', label: 'Cho phép hòa (vòng bảng)', type: 'bool', default: true },
    ],
    implemented: true,
  },
  {
    code: 'BASKETBALL', name: 'Bóng rổ', icon: '🏀',
    participantTypes: ['TEAM'],
    competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }],
    formats: [...TEAM_FORMATS_LIVE, ...TEAM_FORMATS_PLANNED],
    scoringModels: ['POINT_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Sân',
    matchRules: [
      { key: 'winPoints', label: 'Điểm thắng', type: 'int', default: 2, min: 0, max: 10 },
      { key: 'lossPoints', label: 'Điểm thua', type: 'int', default: 0, min: 0, max: 10 },
      { key: 'allowDraw', label: 'Cho phép hòa', type: 'bool', default: false },
    ],
    implemented: true,
  },
  {
    code: 'VOLLEYBALL', name: 'Bóng chuyền', icon: '🏐',
    participantTypes: ['TEAM'],
    competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }],
    formats: [
      { code: 'ROUND_ROBIN', label: 'Vòng tròn', sub: 'Chấm theo số set thắng', dbFormat: 'GROUP_STAGE', implemented: true },
      { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Nhánh loại trực tiếp', dbFormat: 'KNOCKOUT', implemented: true },
      { code: 'GROUP_KNOCKOUT', label: 'Vòng bảng + loại', dbFormat: 'GROUP_STAGE', implemented: false, note: 'Sắp có' },
    ],
    scoringModels: ['SET_BASED', 'POINT_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Sân',
    matchRules: [
      { key: 'bestOf', label: 'Số set', type: 'select', default: 3, options: [{ value: 3, label: 'Best of 3' }, { value: 5, label: 'Best of 5' }] },
      { key: 'pointsPerSet', label: 'Điểm mỗi set', type: 'int', default: 25, min: 5, max: 50 },
    ],
    implemented: false,
  },
  {
    code: 'AIR_VOLLEYBALL', name: 'Bóng chuyền hơi', icon: '🏐',
    participantTypes: ['TEAM'],
    competitions: [{ code: 'TEAM', label: 'Đội', participantType: 'TEAM' }],
    formats: [
      { code: 'ROUND_ROBIN', label: 'Vòng tròn', sub: 'Chấm theo số set thắng', dbFormat: 'GROUP_STAGE', implemented: true },
      { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Nhánh loại trực tiếp', dbFormat: 'KNOCKOUT', implemented: true },
      { code: 'GROUP_KNOCKOUT', label: 'Vòng bảng + loại', dbFormat: 'GROUP_STAGE', implemented: false, note: 'Sắp có' },
    ],
    scoringModels: ['SET_BASED', 'POINT_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Sân',
    matchRules: [
      { key: 'bestOf', label: 'Số set', type: 'select', default: 3, options: [{ value: 3, label: 'Best of 3' }, { value: 5, label: 'Best of 5' }] },
      { key: 'pointsPerSet', label: 'Điểm mỗi set', type: 'int', default: 21, min: 5, max: 40 },
    ],
    implemented: false,
  },
  {
    code: 'GOLF', name: 'Golf', icon: '⛳',
    participantTypes: ['INDIVIDUAL', 'TEAM'],
    competitions: [
      { code: 'INDIVIDUAL', label: 'Cá nhân', participantType: 'INDIVIDUAL' },
      { code: 'TEAM', label: 'Đội', participantType: 'TEAM' },
    ],
    formats: [
      { code: 'GOLF_STROKE_PLAY', label: 'Stroke Play', sub: 'Tính tổng gậy — thấp nhất thắng', dbFormat: 'SINGLES', implemented: true },
      { code: 'GOLF_STABLEFORD', label: 'Stableford', sub: 'Tính điểm theo par — cao nhất thắng', dbFormat: 'SINGLES', implemented: false, note: 'Sắp có (M2)' },
      { code: 'GOLF_MATCH_PLAY', label: 'Match Play', sub: 'Thắng theo từng hố', dbFormat: 'SINGLES', implemented: false, note: 'Sắp có (M2)' },
    ],
    scoringModels: ['STROKE_BASED', 'POINT_BASED'], dbScoringModel: 'LEADERBOARD', resourceTerm: 'Sân / Tee time',
    matchRules: [
      { key: 'rounds', label: 'Số vòng đấu', type: 'int', default: 1, min: 1, max: 8 },
    ],
    implemented: true,
  },
  {
    code: 'RUNNING', name: 'Chạy bộ', icon: '🏃',
    participantTypes: ['INDIVIDUAL'],
    competitions: [{ code: 'DISTANCE', label: 'Theo cự ly / nhóm', participantType: 'INDIVIDUAL' }],
    formats: [
      { code: 'GOLF_STROKE_PLAY', label: 'Xếp hạng theo thời gian', sub: 'Tổng thời gian nhỏ nhất thắng', dbFormat: 'SINGLES', implemented: true },
    ],
    scoringModels: ['TIME_BASED'], dbScoringModel: 'LEADERBOARD', resourceTerm: 'Đường chạy / Làn',
    matchRules: [
      { key: 'rounds', label: 'Số lần chạy / cự ly', type: 'int', default: 1, min: 1, max: 8 },
    ], implemented: true,
  },
  {
    code: 'CHESS', name: 'Cờ vua', icon: '♟️',
    participantTypes: ['INDIVIDUAL'],
    competitions: [
      { code: 'INDIVIDUAL', label: 'Cá nhân', participantType: 'INDIVIDUAL' },
    ],
    formats: [
      { code: 'ROUND_ROBIN', label: 'Vòng tròn (theo bảng)', sub: 'Thắng/hòa/thua theo điểm', dbFormat: 'GROUP_STAGE', implemented: true },
      { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Nhánh loại trực tiếp', dbFormat: 'KNOCKOUT', implemented: true },
    ],
    scoringModels: ['RANK_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Bàn thi đấu',
    matchRules: [
      { key: 'winPoints', label: 'Điểm thắng', type: 'int', default: 1, min: 0, max: 3 },
      { key: 'drawPoints', label: 'Điểm hòa', type: 'int', default: 0, min: 0, max: 3 },
    ],
    implemented: false,
  },
  {
    code: 'XIANGQI', name: 'Cờ tướng', icon: '♟️',
    participantTypes: ['INDIVIDUAL'],
    competitions: [
      { code: 'INDIVIDUAL', label: 'Cá nhân', participantType: 'INDIVIDUAL' },
    ],
    formats: [
      { code: 'ROUND_ROBIN', label: 'Vòng tròn (theo bảng)', sub: 'Thắng/hòa/thua theo điểm', dbFormat: 'GROUP_STAGE', implemented: true },
      { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Nhánh loại trực tiếp', dbFormat: 'KNOCKOUT', implemented: true },
    ],
    scoringModels: ['RANK_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Bàn thi đấu',
    matchRules: [
      { key: 'winPoints', label: 'Điểm thắng', type: 'int', default: 1, min: 0, max: 3 },
      { key: 'drawPoints', label: 'Điểm hòa', type: 'int', default: 0, min: 0, max: 3 },
    ],
    implemented: false,
  },
  {
    code: 'BILLIARDS', name: 'Billiards', icon: '🎱',
    participantTypes: ['INDIVIDUAL'],
    competitions: [
      { code: 'INDIVIDUAL', label: 'Cá nhân', participantType: 'INDIVIDUAL' },
    ],
    formats: [
      { code: 'ROUND_ROBIN', label: 'Vòng tròn (theo bảng)', sub: 'Race-to-N tính theo điểm ván', dbFormat: 'GROUP_STAGE', implemented: true },
      { code: 'SINGLE_ELIMINATION', label: 'Loại trực tiếp', sub: 'Nhánh loại trực tiếp', dbFormat: 'KNOCKOUT', implemented: true },
    ],
    scoringModels: ['POINT_BASED'], dbScoringModel: 'HEAD_TO_HEAD', resourceTerm: 'Bàn',
    matchRules: [
      { key: 'raceTo', label: 'Race to', type: 'int', default: 5, min: 1, max: 20 },
    ],
    implemented: false,
  },
];

const BY_CODE = new Map(PRESETS.map((p) => [p.code, p]));

/** Danh sách preset (metadata cho wizard). */
export function listSportPresets(): SportPreset[] {
  return PRESETS;
}

/** Lấy preset theo code; null nếu không có. */
export function getSportPreset(code: string | null | undefined): SportPreset | null {
  if (!code) return null;
  return BY_CODE.get(code) ?? null;
}

/** Tổ hợp (sport, dbFormat) đã có engine chạy thật chưa — dùng để validate CREATE ở backend. */
export function isImplementedCombo(sport: string, dbFormat: MinigameFormat): boolean {
  const p = getSportPreset(sport);
  if (!p) return false;
  return p.formats.some((f) => f.dbFormat === dbFormat && f.implemented);
}

/**
 * Suy participantType + partnerMode từ (sport, dbFormat) theo LEGACY MAPPING — dùng backfill
 * migration và khi tạo mới nếu client chưa gửi. Bám đúng hành vi engine hiện hữu.
 */
export function deriveParticipantModel(
  sport: string,
  dbFormat: MinigameFormat,
): { participantType: ParticipantType; partnerMode: PartnerMode | null } {
  const preset = getSportPreset(sport);
  const isTeam = preset?.participantTypes.length === 1 && preset.participantTypes[0] === 'TEAM';
  if (isTeam || sport === 'FOOTBALL' || sport === 'BASKETBALL') {
    return { participantType: 'TEAM', partnerMode: null };
  }
  if (sport === 'GOLF' || sport === 'RUNNING') {
    return { participantType: 'INDIVIDUAL', partnerMode: null };
  }
  switch (dbFormat) {
    case 'RANDOM_DOUBLES':
      return { participantType: 'PAIR', partnerMode: 'RANDOM' };
    case 'FIXED_DOUBLES_ROUND_ROBIN':
      return { participantType: 'PAIR', partnerMode: 'FIXED' };
    case 'GROUP_STAGE':
    case 'KNOCKOUT':
      return { participantType: 'INDIVIDUAL', partnerMode: null };
    case 'SINGLES':
      return { participantType: 'INDIVIDUAL', partnerMode: null };
    default:
      return { participantType: 'INDIVIDUAL', partnerMode: null };
  }
}
