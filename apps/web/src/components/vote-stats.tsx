import type { VoteStats } from '../types/index';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface VoteStatsProps {
  stats: VoteStats;
}

export function VoteStatsComponent({ stats }: VoteStatsProps) {
  const hasVotes = Object.keys(stats.distribution).length > 0;

  if (!hasVotes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No votes to display
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Results</span>
          {stats.hasConsensus && (
            <Badge className="bg-green-600" variant="default">
              Consensus!
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div
              className="font-bold text-2xl text-green-600"
              data-testid="vote-min"
            >
              {stats.min}
            </div>
            <div className="text-muted-foreground text-sm">Min</div>
          </div>
          <div>
            <div
              className="font-bold text-2xl text-blue-600"
              data-testid="vote-average"
            >
              {stats.average?.toFixed(1)}
            </div>
            <div className="text-muted-foreground text-sm">Average</div>
          </div>
          <div>
            <div
              className="font-bold text-2xl text-red-600"
              data-testid="vote-max"
            >
              {stats.max}
            </div>
            <div className="text-muted-foreground text-sm">Max</div>
          </div>
        </div>

        {/* Vote Distribution */}
        <div className="space-y-2">
          <div className="font-medium text-sm">Vote Distribution</div>
          {Object.entries(stats.distribution)
            .sort(([a], [b]) => {
              const numA = Number.parseFloat(a);
              const numB = Number.parseFloat(b);
              if (!(isNaN(numA) || isNaN(numB))) {
                return numA - numB;
              }
              return a.localeCompare(b);
            })
            .map(([value, count]) => (
              <div className="flex items-center justify-between" key={value}>
                <div className="flex items-center gap-2">
                  <Badge className="font-mono" variant="outline">
                    {value}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">
                    {count} vote{count !== 1 ? 's' : ''}
                  </div>
                  <div
                    className="h-2 rounded bg-primary"
                    style={{
                      width: `${(count / Object.values(stats.distribution).reduce((a, b) => a + b, 0)) * 100}px`,
                      minWidth: '20px',
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
