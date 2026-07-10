// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Box, Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DataQueriesProvider, MultiQueryEditor, useSuggestedStepMs } from '@perses-dev/plugin-system';
import { useExplorerManagerContext } from '@perses-dev/explore';
import useResizeObserver from 'use-resize-observer';
import { Panel } from '@perses-dev/dashboards';
import { ReactElement, useCallback, useMemo, useState } from 'react';
import { QueryDefinition } from '@perses-dev/spec';
import { produce } from 'immer';
import { DEFAULT_PROM } from '../model/prometheus-selectors';
import { QueryEditorConfigProvider } from '../components/QueryEditorConfigProvider';
import { FinderQueryParams } from './PrometheusMetricsFinder/types';
import { PrometheusMetricsFinder } from './PrometheusMetricsFinder';

interface MetricsExplorerQueryParams extends FinderQueryParams {
  tab?: string;
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 700;
const FILTERED_QUERY_PLUGINS = ['PrometheusTimeSeriesQuery'];

function TimeSeriesPanel({
  query,
  runCount,
  title,
  onLegendFormatChange,
}: {
  query: QueryDefinition;
  runCount: number;
  title: string;
  onLegendFormatChange: (format: string) => void;
}): ReactElement {
  const { width, ref: boxRef } = useResizeObserver();
  const height = PANEL_PREVIEW_HEIGHT;
  const [stacked, setStacked] = useState(false);
  const initialFormat = (query.spec.plugin.spec as Record<string, unknown>)?.seriesNameFormat as string ?? '';
  const [legendFormatInput, setLegendFormatInput] = useState<string>(initialFormat);
  const [legendFormat, setLegendFormat] = useState<string>(initialFormat);

  const suggestedStepMs = useSuggestedStepMs(width);

  const queriesWithFormat = useMemo(() => {
    if (!legendFormat) return [query];
    return [{
      ...query,
      spec: {
        ...query.spec,
        plugin: {
          ...query.spec.plugin,
          spec: { ...query.spec.plugin.spec, seriesNameFormat: legendFormat },
        },
      },
    }];
  }, [query, legendFormat]);

  const definition = useMemo(
    () => ({
      kind: 'Panel' as const,
      spec: {
        queries: queriesWithFormat,
        display: { name: '' },
        plugin: {
          kind: 'TimeSeriesChart',
          spec: {
            legend: { position: 'bottom', mode: 'list' },
            visual: stacked ? { stack: 'all', areaOpacity: 0.3 } : {},
          },
        },
      },
    }),
    [queriesWithFormat, stacked]
  );

  if (!width) {
    return <Box ref={boxRef} height={height} width="100%" />;
  }

  return (
    <Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            width: width ? width / 2 : 300,
            backgroundColor: '#eeeeee',
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <TextField
            size="small"
            placeholder="Format legend with {{label_name}} to interpolate label values"
            value={legendFormatInput}
            onChange={(e) => setLegendFormatInput(e.target.value)}
            onBlur={() => {
              setLegendFormat(legendFormatInput);
              onLegendFormatChange(legendFormatInput);
            }}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#fff',
                borderRadius: '4px',
              },
            }}
          />
          <Box sx={{ width: '1px', height: 24, backgroundColor: '#ccc' }} />
          <ToggleButtonGroup
            value={stacked ? 'stacked' : 'unstacked'}
            exclusive
            onChange={(_, value) => {
              if (value !== null) {
                setStacked(value === 'stacked');
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '4px !important',
                px: 2,
                color: '#666',
                '&.Mui-selected': {
                  backgroundColor: '#fff !important',
                  color: '#000 !important',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.5)',
                },
              },
            }}
          >
            <ToggleButton value="unstacked">Unstacked</ToggleButton>
            <ToggleButton value="stacked">Stacked</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      <Box ref={boxRef} height={height} width="100%">
        <DataQueriesProvider key={runCount} definitions={queriesWithFormat} options={{ suggestedStepMs, mode: 'range' }}>
          <Panel
            panelOptions={{
              hideHeader: true,
            }}
            definition={definition}
          />
        </DataQueriesProvider>
      </Box>
    </Stack>
  );
}

function MetricDataTable({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const height = PANEL_PREVIEW_HEIGHT;

  return (
    <Box height={height}>
      <DataQueriesProvider definitions={queries} options={{ mode: 'instant' }}>
        <Panel
          panelOptions={{
            hideHeader: true,
          }}
          definition={{
            kind: 'Panel',
            spec: { queries: queries, display: { name: '' }, plugin: { kind: 'TimeSeriesTable', spec: {} } },
          }}
        />
      </DataQueriesProvider>
    </Box>
  );
}

export function PrometheusExplorer(): ReactElement {
  const {
    data: { tab = 'table', queries = [], datasource = DEFAULT_PROM, filters = [], exploredMetric = undefined },
    setData,
  } = useExplorerManagerContext<MetricsExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);
  const [runCounts, setRunCounts] = useState<number[]>(() => queries.map(() => 0));

  const handleLegendFormatChange = useCallback((index: number, format: string) => {
    setQueryDefinitions((prev) =>
      produce(prev, (draft) => {
        if (draft[index]) {
          draft[index].spec.plugin.spec = {
            ...draft[index].spec.plugin.spec,
            seriesNameFormat: format || undefined,
          };
        }
      })
    );
  }, []);

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_, state) => setData({ tab: state, queries })}
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="table" label="Table" />
        <Tab value="graph" label="Graph" />
        <Tab value="finder" label="Finder" />
      </Tabs>
      <Stack gap={1}>
        {tab === 'table' && (
          <Stack>
            <MultiQueryEditor
              queryTypes={['TimeSeriesQuery']}
              onChange={(state) => setQueryDefinitions(state)}
              queries={queryDefinitions}
              onQueryRun={() => setData({ tab, queries: queryDefinitions })}
              filteredQueryPlugins={FILTERED_QUERY_PLUGINS}
            />
            <MetricDataTable queries={queries} />
          </Stack>
        )}
        {tab === 'graph' && (
          <Stack gap={3}>
            <QueryEditorConfigProvider hiddenFields={['seriesNameFormat']}>
              <MultiQueryEditor
              queryTypes={['TimeSeriesQuery']}
              onChange={(state) => setQueryDefinitions(state)}
              queries={queryDefinitions}
              onQueryRun={(index) => {
                const updated = [...queryDefinitions];
                setData({ tab, queries: updated });
                setRunCounts((counts) => {
                  const next = [...counts];
                  while (next.length <= index) {
                    next.push(0);
                  }
                  next[index] = (next[index] ?? 0) + 1;
                  return next;
                });
              }}
              filteredQueryPlugins={FILTERED_QUERY_PLUGINS}
            />
            </QueryEditorConfigProvider>
            {queryDefinitions.map((query, index) => (
              <TimeSeriesPanel
                key={index}
                query={query}
                runCount={runCounts[index] ?? 0}
                title={queryDefinitions[index]?.spec.name ?? `Query #${index + 1}`}
                onLegendFormatChange={(format) => handleLegendFormatChange(index, format)}
              />
            ))}
          </Stack>
        )}
        {tab === 'finder' && (
          <Stack>
            <PrometheusMetricsFinder
              onChange={(state) => setData({ tab, ...state })}
              value={{ datasource, filters, exploredMetric }}
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
