export type SkillLevel = 'Cao' | 'TB' | 'Thấp';

interface SkillBadgeProps {
  skill: SkillLevel;
  size?: 'sm' | 'xs';
}

interface SkillConfig {
  badgeClass: string;
  dotClass: string;
}

const SKILL_CONFIG: Record<SkillLevel, SkillConfig> = {
  Cao: {
    badgeClass: '[background:var(--pf-color-danger-soft)] [color:var(--pf-color-danger)]',
    dotClass: '[background:var(--pf-color-danger)]',
  },
  TB: {
    badgeClass: '[background:var(--pf-color-warning-soft)] [color:var(--pf-color-warning)]',
    dotClass: '[background:var(--pf-color-warning)]',
  },
  Thấp: {
    badgeClass: '[background:var(--pf-color-info-soft)] [color:var(--pf-color-info)]',
    dotClass: '[background:var(--pf-color-info)]',
  },
};

export function SkillBadge({ skill, size = 'sm' }: SkillBadgeProps) {
  // Fallback: skill lạ/undefined KHÔNG được ném lỗi (tránh crash panel).
  const config = SKILL_CONFIG[skill] ?? SKILL_CONFIG.TB;
  const paddingClass = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${paddingClass} ${config.badgeClass}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {skill}
    </span>
  );
}
