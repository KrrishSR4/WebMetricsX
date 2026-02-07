import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreGauge } from './ScoreGauge';
import { Check, X, AlertTriangle, Search, FileText, Image, Globe, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SEOMetrics } from '@/types/metrics';

interface SEOAnalysisProps {
  data: SEOMetrics;
}

function CheckItem({ passed, label, description }: { passed: boolean; label: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
          passed ? 'bg-status-up/10 text-status-up' : 'bg-status-down/10 text-status-down'
        )}
      >
        {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', passed ? 'text-foreground' : 'text-status-down')}>
          {label}
        </p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

export function SEOAnalysis({ data }: SEOAnalysisProps) {
  return (
    <div className="space-y-6">
      {/* SEO Score Overview */}
      <Card className="chart-animate">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-metric-seo" />
            <CardTitle className="text-base font-medium">SEO Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div id="seo-analysis-chart" className="space-y-6 flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={data.score} label="SEO Score" size="lg" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-2xl font-bold">{data.headings.h1Count}</p>
                <p className="text-xs text-muted-foreground">H1 Tags</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl font-bold">{data.headings.h2Count}</p>
                <p className="text-xs text-muted-foreground">H2 Tags</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl font-bold">{data.images.total}</p>
                <p className="text-xs text-muted-foreground">Images</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-2xl font-bold text-status-up">{data.images.withAlt}</p>
                <p className="text-xs text-muted-foreground">With ALT</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO Checklist */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="chart-animate">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-chart-1" />
              <CardTitle className="text-base font-medium">Content Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <CheckItem
                passed={data.titleTag.present}
                label="Title Tag"
                description={data.titleTag.content ? `"${data.titleTag.content.slice(0, 50)}${data.titleTag.content.length > 50 ? '...' : ''}" (${data.titleTag.length} chars)` : 'Missing'}
              />
              <CheckItem
                passed={data.metaDescription.present}
                label="Meta Description"
                description={data.metaDescription.content ? `${data.metaDescription.length} characters` : 'Missing'}
              />
              <CheckItem
                passed={data.headings.hasProperStructure}
                label="Heading Structure"
                description={`${data.headings.h1Count} H1, ${data.headings.h2Count} H2 tags`}
              />
              <CheckItem
                passed={data.images.missingAlt === 0}
                label="Image ALT Tags"
                description={data.images.missingAlt > 0 ? `${data.images.missingAlt} images missing ALT` : 'All images have ALT tags'}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="chart-animate">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-chart-4" />
              <CardTitle className="text-base font-medium">Technical SEO</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <CheckItem passed={data.canonicalTag} label="Canonical Tag" />
              <CheckItem passed={data.robotsTxt} label="Robots.txt" />
              <CheckItem passed={data.sitemap} label="Sitemap.xml" />
              <CheckItem passed={data.mobileFriendly} label="Mobile Friendly" />
              <CheckItem passed={data.indexable} label="Indexable" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Recommendations */}
      {(data.issues.length > 0 || data.recommendations.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.issues.length > 0 && (
            <Card className="chart-animate border-l-4 border-l-status-down">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-status-down" />
                  <CardTitle className="text-base font-medium">Issues Found</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <X className="h-4 w-4 text-status-down flex-shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.recommendations.length > 0 && (
            <Card className="chart-animate border-l-4 border-l-status-degraded">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-status-degraded" />
                  <CardTitle className="text-base font-medium">Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-status-degraded flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
