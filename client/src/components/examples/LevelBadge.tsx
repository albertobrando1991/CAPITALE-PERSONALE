import { LevelBadge } from "../LevelBadge";

export default function LevelBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <LevelBadge level={5} />
      <LevelBadge level={25} />
      <LevelBadge level={50} />
      <LevelBadge level={75} />
    </div>
  );
}
