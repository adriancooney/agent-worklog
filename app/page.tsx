'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Card,
  Flex,
  Button,
  Select,
  Badge,
  Callout,
  Spinner,
  Code,
} from '@radix-ui/themes';
import { ChevronDownIcon, ChevronUpIcon, ReloadIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import { useLocalApi } from './hooks/useLocalApi';

function getSummaryCacheKey(filters: { category: string; projectName: string; daysBack: string }): string {
  return `aw-summary-${filters.daysBack}-${filters.category}-${filters.projectName}`;
}

function getCachedSummary(filters: { category: string; projectName: string; daysBack: string }): string | null {
  if (typeof window === 'undefined') return null;
  const key = getSummaryCacheKey(filters);
  return localStorage.getItem(key);
}

function setCachedSummary(filters: { category: string; projectName: string; daysBack: string }, summary: string): void {
  if (typeof window === 'undefined') return;
  const key = getSummaryCacheKey(filters);
  localStorage.setItem(key, summary);
}

function parseSummary(summary: string): { preview: string; details: string } {
  const separatorIndex = summary.indexOf('\n---\n');
  if (separatorIndex === -1) {
    const firstParagraph = summary.split('\n\n')[0] || summary;
    return { preview: firstParagraph, details: summary };
  }
  const preview = summary.slice(0, separatorIndex).trim();
  const details = summary.slice(separatorIndex + 5).trim();
  return { preview, details };
}

interface WorkEntry {
  id: number;
  timestamp: string;
  taskDescription: string;
  sessionId: string | null;
  category: string | null;
  projectName: string | null;
  gitBranch: string | null;
  workingDirectory: string | null;
}

interface WorkLogData {
  entries: WorkEntry[];
  total: number;
  categories: string[];
  projects: string[];
}

function getInitialFilters(): { category: string; projectName: string; daysBack: string } {
  if (typeof window === 'undefined') {
    return { category: 'all', projectName: 'all', daysBack: '7' };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    category: params.get('category') || 'all',
    projectName: params.get('projectName') || 'all',
    daysBack: params.get('daysBack') || '7',
  };
}

export default function Home() {
  const { isConnected, isConnecting, error: connectionError, fetchApi } = useLocalApi();

  const [data, setData] = useState<WorkLogData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const [filters, setFilters] = useState(getInitialFilters);

  const [visibleEntries, setVisibleEntries] = useState(10);
  const ENTRIES_PER_PAGE = 10;

  const fetchData = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.projectName && filters.projectName !== 'all') params.append('projectName', filters.projectName);
      if (filters.daysBack) params.append('daysBack', filters.daysBack);

      const result = await fetchApi<WorkLogData>(`/api/worklog?${params.toString()}`);
      setData(result);
      setVisibleEntries(ENTRIES_PER_PAGE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, fetchApi, filters]);

  const fetchSummary = useCallback(async (forceRegenerate = false) => {
    if (!isConnected) return;

    if (!forceRegenerate) {
      const cached = getCachedSummary(filters);
      if (cached) {
        setSummary(cached);
        return;
      }
    }

    setIsLoadingSummary(true);

    try {
      const params: Record<string, unknown> = { daysBack: parseInt(filters.daysBack, 10) };
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.projectName !== 'all') params.projectName = filters.projectName;

      const result = await fetchApi<{ summary: string }>('/api/summary', {
        method: 'POST',
        body: params,
      });
      setSummary(result.summary);
      setCachedSummary(filters, result.summary);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary('Failed to generate summary.');
    } finally {
      setIsLoadingSummary(false);
    }
  }, [isConnected, fetchApi, filters]);

  useEffect(() => {
    if (isConnected) {
      fetchData();
    }
  }, [isConnected, fetchData]);

  useEffect(() => {
    if (isConnected && data && data.entries.length > 0 && !isLoadingSummary) {
      fetchSummary();
    }
  }, [isConnected, data, isLoadingSummary, fetchSummary]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (filters.category !== 'all') {
      params.set('category', filters.category);
    } else {
      params.delete('category');
    }

    if (filters.projectName !== 'all') {
      params.set('projectName', filters.projectName);
    } else {
      params.delete('projectName');
    }

    if (filters.daysBack !== '7') {
      params.set('daysBack', filters.daysBack);
    } else {
      params.delete('daysBack');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const getCategoryColor = (category: string | null): "gray" | "blue" | "red" | "purple" | "green" | "orange" | "cyan" | "yellow" | "crimson" | "indigo" => {
    if (!category) return 'gray';
    const colors: Record<string, "gray" | "blue" | "red" | "purple" | "green" | "orange" | "cyan" | "yellow" | "crimson" | "indigo"> = {
      feature: 'blue',
      bugfix: 'red',
      refactor: 'purple',
      docs: 'green',
      config: 'orange',
      test: 'cyan',
      perf: 'yellow',
      infra: 'gray',
      security: 'crimson',
      research: 'indigo',
    };
    return colors[category] || 'gray';
  };

  if (isConnecting) {
    return (
      <Container size="2" style={{ padding: '4rem 1rem' }}>
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Spinner size="3" />
            <Heading size="5">Connecting to local server...</Heading>
            <Text color="gray" size="2">
              Establishing connection to your work log database
            </Text>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (connectionError) {
    return (
      <Container size="2" style={{ padding: '4rem 1rem' }}>
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5" color="red">Connection Failed</Heading>
            <Text color="gray" align="center">
              {connectionError}
            </Text>
            <Box mt="4">
              <Text size="2" color="gray">
                To view your work log, run:
              </Text>
              <Code size="3" mt="2" style={{ display: 'block', padding: '0.5rem 1rem' }}>
                aw web
              </Code>
            </Box>
          </Flex>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="4" style={{ padding: '2rem 1rem' }}>
      <Box mb="6">
        <Heading size="8" mb="2">
          Agent Work Log
        </Heading>
        <Text color="gray" size="3">
          Browse and analyze AI agent work activities
        </Text>
      </Box>

      <Flex direction="column" gap="4">
        <Card>
          <Flex gap="3" align="end" wrap="wrap">
            <Box style={{ flex: '1', minWidth: '150px' }}>
              <Text size="2" weight="medium" mb="1" color="gray">
                Time Range
              </Text>
              <Select.Root
                value={filters.daysBack}
                onValueChange={(value) => setFilters({ ...filters, daysBack: value })}
              >
                <Select.Trigger style={{ width: '100%' }} />
                <Select.Content>
                  <Select.Item value="1">Last 24 hours</Select.Item>
                  <Select.Item value="7">Last 7 days</Select.Item>
                  <Select.Item value="30">Last 30 days</Select.Item>
                  <Select.Item value="90">Last 90 days</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>

            {data && data.categories.length > 0 && (
              <Box style={{ flex: '1', minWidth: '150px' }}>
                <Text size="2" weight="medium" mb="1" color="gray">
                  Category
                </Text>
                <Select.Root
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value })
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="all">All categories</Select.Item>
                    {data.categories.map((cat) => (
                      <Select.Item key={cat} value={cat}>
                        {cat}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
            )}

            {data && data.projects.length > 0 && (
              <Box style={{ flex: '1', minWidth: '150px' }}>
                <Text size="2" weight="medium" mb="1" color="gray">
                  Project
                </Text>
                <Select.Root
                  value={filters.projectName}
                  onValueChange={(value) =>
                    setFilters({ ...filters, projectName: value })
                  }
                >
                  <Select.Trigger style={{ width: '100%' }} />
                  <Select.Content>
                    <Select.Item value="all">All projects</Select.Item>
                    {data.projects.map((proj) => (
                      <Select.Item key={proj} value={proj}>
                        {proj}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Box>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex justify="between" align="center">
            <Heading size="4">Summary</Heading>
            <Button
              variant="ghost"
              size="1"
              onClick={() => fetchSummary(true)}
              disabled={isLoadingSummary || !data || data.entries.length === 0}
            >
              <ReloadIcon />
            </Button>
          </Flex>

          {isLoadingSummary ? (
            <Flex align="center" justify="center" gap="2" py="6">
              <Spinner size="2" />
              <Text color="gray" size="2">Generating summary...</Text>
            </Flex>
          ) : summary ? (
            (() => {
              const { preview, details } = parseSummary(summary);
              const markdownComponents = {
                h1: ({ children }: { children?: React.ReactNode }) => (
                  <Heading size="5" mb="3" mt="4">
                    {children}
                  </Heading>
                ),
                h2: ({ children }: { children?: React.ReactNode }) => (
                  <Heading size="4" mb="2" mt="4">
                    {children}
                  </Heading>
                ),
                h3: ({ children }: { children?: React.ReactNode }) => (
                  <Heading size="3" mb="2" mt="3">
                    {children}
                  </Heading>
                ),
                p: ({ children }: { children?: React.ReactNode }) => (
                  <Text as="p" size="2" mb="2" style={{ lineHeight: '1.7' }}>
                    {children}
                  </Text>
                ),
                strong: ({ children }: { children?: React.ReactNode }) => (
                  <Text weight="bold">{children}</Text>
                ),
                ul: ({ children }: { children?: React.ReactNode }) => (
                  <ul style={{ marginLeft: '1rem', marginBottom: '0.75rem', lineHeight: '1.7' }}>
                    {children}
                  </ul>
                ),
                ol: ({ children }: { children?: React.ReactNode }) => (
                  <ol style={{ marginLeft: '1rem', marginBottom: '0.75rem', lineHeight: '1.7' }}>
                    {children}
                  </ol>
                ),
                li: ({ children }: { children?: React.ReactNode }) => (
                  <li style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    {children}
                  </li>
                ),
                hr: () => <Box my="4" style={{ borderTop: '1px solid var(--gray-a6)' }} />,
              };
              return (
                <Box className="markdown-content" mt="3">
                  <ReactMarkdown components={markdownComponents}>
                    {preview}
                  </ReactMarkdown>
                  {isSummaryExpanded && details && (
                    <Box mt="3" pt="3" style={{ borderTop: '1px solid var(--gray-a6)' }}>
                      <ReactMarkdown components={markdownComponents}>
                        {details}
                      </ReactMarkdown>
                    </Box>
                  )}
                  {details && (
                    <Flex
                      justify="center"
                      mt="3"
                      pt="2"
                      style={{ borderTop: '1px solid var(--gray-a6)', marginLeft: '-16px', marginRight: '-16px', paddingLeft: '16px', paddingRight: '16px' }}
                    >
                      <Button
                        variant="ghost"
                        size="1"
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                      >
                        {isSummaryExpanded ? (
                          <>
                            <ChevronUpIcon /> Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon /> Show More
                          </>
                        )}
                      </Button>
                    </Flex>
                  )}
                </Box>
              );
            })()
          ) : (
            <Text color="gray" size="2" mt="2">No summary available</Text>
          )}
        </Card>

        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {isLoading ? (
          <Card>
            <Flex justify="center" align="center" p="6">
              <Spinner />
              <Text color="gray" ml="2">Loading work entries...</Text>
            </Flex>
          </Card>
        ) : data && data.entries.length === 0 ? (
          <Card>
            <Flex justify="center" align="center" p="6" direction="column" gap="2">
              <Text color="gray" size="4" weight="bold">
                No work entries found
              </Text>
              <Text color="gray" size="2">
                Try adjusting your filters or log some work with the aw CLI
              </Text>
            </Flex>
          </Card>
        ) : (
          data && (
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text color="gray" size="2">
                  Showing {Math.min(visibleEntries, data.entries.length)} of {data.total} entries
                </Text>
              </Flex>

              {data.entries.slice(0, visibleEntries).map((entry) => (
                <Card key={entry.id}>
                  <Flex direction="column" gap="2">
                    <Flex justify="between" align="start">
                      <Text size="3" weight="medium">
                        {entry.taskDescription}
                      </Text>
                      {entry.category && (
                        <Badge color={getCategoryColor(entry.category)}>
                          {entry.category}
                        </Badge>
                      )}
                    </Flex>

                    <Flex gap="4" wrap="wrap">
                      <Text size="2" color="gray">
                        {formatDate(entry.timestamp)}
                      </Text>
                      {entry.projectName && (
                        <Text size="2" color="gray">
                          📁 {entry.projectName}
                        </Text>
                      )}
                      {entry.gitBranch && (
                        <Text size="2" color="gray">
                          🌿 {entry.gitBranch}
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              ))}

              {visibleEntries < data.entries.length && (
                <Flex justify="center" pt="2">
                  <Button
                    variant="ghost"
                    size="1"
                    onClick={() => setVisibleEntries(prev => prev + ENTRIES_PER_PAGE)}
                  >
                    <ChevronDownIcon /> Show More
                  </Button>
                </Flex>
              )}
            </Flex>
          )
        )}
      </Flex>
    </Container>
  );
}
