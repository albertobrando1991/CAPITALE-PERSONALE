import { Trophy, Award, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBenessere } from '@/contexts/BenessereContext';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

export default function BenessereAchievements() {
  const { stats } = useBenessere();

  if (!stats) return null;

  const achievements: Achievement[] = [
    {
      id: 'hydration_week',
      title: 'Idratato per 7 Giorni',
      description: 'Raggiungi l\'obiettivo idratazione per 7 giorni consecutivi',
      icon: '💧',
      unlocked: (stats.achievements?.hydration_streak || 0) >= 7,
      progress: stats.achievements?.hydration_streak || 0,
      target: 7
    },
    {
      id: 'breathing_master',
      title: 'Maestro del Respiro',
      description: 'Completa 50 sessioni di Box Breathing',
      icon: '🧘',
      unlocked: (stats.achievements?.total_breathing_sessions || 0) >= 50,
      progress: stats.achievements?.total_breathing_sessions || 0,
      target: 50
    },
    {
      id: 'sleep_champion',
      title: 'Campione del Sonno',
      description: 'Dormi 8+ ore per 10 notti consecutive',
      icon: '💤',
      unlocked: (stats.achievements?.sleep_streak || 0) >= 10,
      progress: stats.achievements?.sleep_streak || 0,
      target: 10
    },
    {
      id: 'reframe_guru',
      title: 'Guru del Reframing',
      description: 'Salva 25 reframe cognitivi',
      icon: '💬',
      unlocked: (stats.achievements?.total_reframes || 0) >= 25,
      progress: stats.achievements?.total_reframes || 0,
      target: 25
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Obiettivi Benessere
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                ach.unlocked
                  ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800'
              }`}
            >
              <div className="text-3xl">
                {ach.unlocked ? '🏆' : ach.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{ach.title}</p>
                <p className="text-xs text-muted-foreground">{ach.description}</p>
                {!ach.unlocked && ach.progress !== undefined && ach.target && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{
                            width: `${(ach.progress / ach.target) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground">
                        {ach.progress}/{ach.target}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {ach.unlocked && (
                <Badge className="bg-yellow-500 text-white">
                  <Star className="h-3 w-3" />
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
