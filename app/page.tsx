'use client';

import { useEffect, useState } from 'react';
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
  Tabs,
} from '@radix-ui/themes';
import ReactMarkdown from 'react-markdown';
import useSWR from 'swr';

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const [filters, setFilters] = useState({
    category: 'all',
    projectName: 'all',
    daysBack: '7',
  });

  const buildApiUrl = () => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.projectName && filters.projectName !== 'all') params.append('projectName', filters.projectName);
    if (filters.daysBack) params.append('daysBack', filters.daysBack);
    return `/api/worklog?${params.toString()}`;
  };

  const { data, error, isLoading } = useSWR<WorkLogData>(buildApiUrl(), fetcher);

  const fetchSummary = async () => {
    setIsLoadingSummary(true);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack: parseInt(filters.daysBack, 10) }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const result = await response.json();
      setSummary(result.summary);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setSummary('Failed to generate summary. Please check your ANTHROPIC_API_KEY.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (data && data.entries.length > 0 && !summary && !isLoadingSummary) {
      fetchSummary();
    }
  }, [data]);

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

  const getCategoryColor = (category: string | null): any => {
    if (!category) return 'gray';
    const colors: Record<string, any> = {
      feature: 'blue',
      bugfix: 'red',
      refactor: 'purple',
      docs: 'green',
      config: 'orange',
      test: 'cyan',
      perf: 'yellow',
      infra: 'brown',
      security: 'crimson',
    };
    return colors[category] || 'gray';
  };

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
                onValueChange={(value) =>
                  setFilters({ ...filters, daysBack: value })
                }
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

        <Tabs.Root defaultValue="summary">
          <Tabs.List>
            <Tabs.Trigger value="summary">AI Summary</Tabs.Trigger>
            <Tabs.Trigger value="entries">Work Log Entries</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4">
            <Tabs.Content value="summary">
              <Card>
                <Flex direction="column" gap="3">
                  <Flex justify="between" align="center">
                    <Heading size="5">AI Summary</Heading>
                    <Button
                      variant="soft"
                      onClick={fetchSummary}
                      disabled={isLoadingSummary}
                    >
                      {isLoadingSummary ? 'Generating...' : 'Regenerate'}
                    </Button>
                  </Flex>
                  <Box
                    style={{
                      lineHeight: '1.6',
                    }}
                  >
                    {isLoadingSummary ? (
                      <Flex align="center" gap="2" p="4">
                        <Spinner />
                        <Text color="gray">Generating AI summary...</Text>
                      </Flex>
                    ) : summary ? (
                      <Box className="markdown-content">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <Heading size="7" mb="3" mt="4">
                                {children}
                              </Heading>
                            ),
                            h2: ({ children }) => (
                              <Heading size="6" mb="2" mt="4">
                                {children}
                              </Heading>
                            ),
                            h3: ({ children }) => (
                              <Heading size="5" mb="2" mt="3">
                                {children}
                              </Heading>
                            ),
                            p: ({ children }) => (
                              <Text as="p" size="3" mb="3" style={{ lineHeight: '1.7' }}>
                                {children}
                              </Text>
                            ),
                            strong: ({ children }) => (
                              <Text weight="bold">{children}</Text>
                            ),
                            ul: ({ children }) => (
                              <Box as="ul" ml="4" mb="3" style={{ lineHeight: '1.7' }}>
                                {children}
                              </Box>
                            ),
                            ol: ({ children }) => (
                              <Box as="ol" ml="4" mb="3" style={{ lineHeight: '1.7' }}>
                                {children}
                              </Box>
                            ),
                            li: ({ children }) => (
                              <Text as="li" size="3" mb="1">
                                {children}
                              </Text>
                            ),
                            hr: () => <Box my="4" style={{ borderTop: '1px solid var(--gray-a6)' }} />,
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </Box>
                    ) : (
                      <Text color="gray">No summary available</Text>
                    )}
                  </Box>
                </Flex>
              </Card>
            </Tabs.Content>

            <Tabs.Content value="entries">
              {error && (
                <Callout.Root color="red" mb="4">
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
                        Showing {data.entries.length} of {data.total} entries
                      </Text>
                    </Flex>

                    {data.entries.map((entry) => (
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
                  </Flex>
                )
              )}
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
