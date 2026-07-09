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

import { Box, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DataQueriesProvider, MultiQueryEditor, useSuggestedStepMs } from '@perses-dev/plugin-system';
import { useExplorerManagerContext } from '@perses-dev/explore';
import useResizeObserver from 'use-resize-observer';
import { Panel } from '@perses-dev/dashboards';
import { ReactElement, useMemo, useState } from 'react';
import { QueryDefinition } from '@perses-dev/spec';
import { DEFAULT_PROM } from '../model/prometheus-selectors';
import { FinderQueryParams } from './PrometheusMetricsFinder/types';
import { PrometheusMetricsFinder } from './PrometheusMetricsFinder';

interface MetricsExplorerQueryParams extends FinderQueryParams {
  tab?: string;
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 700;
const FILTERED_QUERY_PLUGINS = ['PrometheusTimeSeriesQuery'];

function TimeSeriesPanel({ queries, stacked }: { queries: QueryDefinition[]; stacked: boolean }): ReactElement {
  const { width, ref: boxRef } = useResizeObserver();
  const height = PANEL_PREVIEW_HEIGHT;

  const suggestedStepMs = useSuggestedStepMs(width);

  const definition = useMemo(
    () => ({
      kind: 'Panel' as const,
      spec: {
        queries: queries,
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
    [queries, stacked]
  );

  if (!width) {
    return <Box ref={boxRef} height={height} width="100%" />;
  }

  return (
    <Box ref={boxRef} height={height} width="100%">
      <DataQueriesProvider definitions={queries} options={{ suggestedStepMs, mode: 'range' }}>
        <Panel
          panelOptions={{
            hideHeader: true,
          }}
          definition={definition}
        />
      </DataQueriesProvider>
    </Box>
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
  const [stacked, setStacked] = useState(false);

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
            <MultiQueryEditor
              queryTypes={['TimeSeriesQuery']}
              onChange={(state) => setQueryDefinitions(state)}
              queries={queryDefinitions}
              onQueryRun={() => setData({ tab, queries: queryDefinitions })}
              filteredQueryPlugins={FILTERED_QUERY_PLUGINS}
            />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
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
                  backgroundColor: '#eeeeee',
                  borderRadius: 1,
                  p: 0.5,
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
            <TimeSeriesPanel queries={queries} stacked={stacked} />
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
