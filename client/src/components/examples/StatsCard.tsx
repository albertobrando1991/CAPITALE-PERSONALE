import { StatsCard } from "../StatsCard";
import { BookOpen } from "lucide-react";

export default function StatsCardExample() {
  return (
    <StatsCard
      title="Materiali"
      value={12}
      subtitle="3 in elaborazione"
      icon={BookOpen}
      trend={{ value: 15, isPositive: true }}
    />
  );
}
