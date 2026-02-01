import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreGauge } from './ScoreGauge';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, AlertTriangle, Search, FileText, Globe, ChevronDown, Share2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { SEOMetrics, SEOIssue } from '@/types/metrics';

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

function SeverityBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'High', className: 'bg-status-down/10 text-status-down border-status-down/20' },
    medium: { label: 'Medium', className: 'bg-status-degraded/10 text-status-degraded border-status-degraded/20' },
    low: { label: 'Low', className: 'bg-chart-1/10 text-chart-1 border-chart-1/20' },
  };

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config[severity].className)}>
      {config[severity].label}
    </Badge>
  );
}

function CategoryIcon({ category }: { category: SEOIssue['category'] }) {
  const icons = {
    technical: Globe,
    content: FileText,
    social: Share2,
    performance: Zap,
  };
  const Icon = icons[category];
  return <Icon className="h-4 w-4" />;
}

function EnhancedIssueCard({ issue }: { issue: SEOIssue }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
          <div className="flex-shrink-0 mt-0.5">
            <CategoryIcon category={issue.category} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{issue.issue}</span>
              <SeverityBadge severity={issue.severity} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{issue.category}</p>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-10 pr-3 pb-3 space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Impact</p>
            <p className="text-sm">{issue.impact}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Solution</p>
            <p className="text-sm text-chart-1">{issue.solution}</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SEOAnalysis({ data }: SEOAnalysisProps) {
  // Sort enhanced issues by severity
  const sortedIssues = [...(data.enhancedIssues || [])].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const issuesByCategory = sortedIssues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, SEOIssue[]>);

  const highCount = sortedIssues.filter(i => i.severity === 'high').length;
  const mediumCount = sortedIssues.filter(i => i.severity === 'medium').length;
  const lowCount = sortedIssues.filter(i => i.severity === 'low').length;

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
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={data.score} label="SEO Score" size="lg" />
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          {/* Issue Summary */}
          {sortedIssues.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Issues:</span>
              {highCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-status-down" />
                  <span className="text-sm font-medium">{highCount} High</span>
                </div>
              )}
              {mediumCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-status-degraded" />
                  <span className="text-sm font-medium">{mediumCount} Medium</span>
                </div>
              )}
              {lowCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-chart-1" />
                  <span className="text-sm font-medium">{lowCount} Low</span>
                </div>
              )}
            </div>
          )}
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

      {/* Enhanced Checks */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="chart-animate">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-chart-2" />
              <CardTitle className="text-base font-medium">Social & Sharing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <CheckItem passed={data.openGraph?.hasTitle ?? false} label="Open Graph Title" />
              <CheckItem passed={data.openGraph?.hasDescription ?? false} label="Open Graph Description" />
              <CheckItem passed={data.openGraph?.hasImage ?? false} label="Open Graph Image" />
              <CheckItem passed={data.twitterCard?.present ?? false} label="Twitter Card" description={data.twitterCard?.type ?? undefined} />
            </div>
          </CardContent>
        </Card>

        <Card className="chart-animate">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-chart-5" />
              <CardTitle className="text-base font-medium">Advanced</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              <CheckItem passed={data.structuredData ?? false} label="Structured Data (JSON-LD)" />
              <CheckItem passed={!!data.language} label="Language Tag" description={data.language ?? undefined} />
              <CheckItem passed={data.favicon ?? false} label="Favicon" />
              <CheckItem passed={data.compression ?? false} label="Compression (gzip/brotli)" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Issues with Expandable Details */}
      {sortedIssues.length > 0 && (
        <Card className="chart-animate">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-status-degraded" />
              <CardTitle className="text-base font-medium">Issues & Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {sortedIssues.map((issue, index) => (
                <EnhancedIssueCard key={index} issue={issue} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
