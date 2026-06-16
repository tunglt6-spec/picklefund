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
    badgeClass: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500',
  },
  TB: {
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500',
  },
  Thấp: {
    badgeClass: 'bg-sky-100 text-sky-700',
    dotClass: 'bg-sky-500',
  },
};

export function SkillBadge({ skill, size = 'sm' }: SkillBadgeProps) {
  const config = SKILL_CONFIG[skill];
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
