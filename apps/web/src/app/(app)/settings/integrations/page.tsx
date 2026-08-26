'use client';

import { PageHeader } from '@/components/page-header';
import { McpActivityCard } from '@/components/mcp/mcp-activity-card';
import { McpConnectionsCard } from '@/components/mcp/mcp-connections-card';
import { McpGeneralSettingsCard } from '@/components/mcp/mcp-general-settings-card';
import { McpSetupGuideCard } from '@/components/mcp/mcp-setup-guide-card';
import { McpTokensCard } from '@/components/mcp/mcp-tokens-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Integraciones"
        description="Conecta agentes de IA (como Claude) a tu cuenta de Fluxo por MCP."
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="connections">Apps conectadas</TabsTrigger>
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-6">
          <McpGeneralSettingsCard />
          <McpSetupGuideCard />
        </TabsContent>
        <TabsContent value="connections">
          <McpConnectionsCard />
        </TabsContent>
        <TabsContent value="tokens">
          <McpTokensCard />
        </TabsContent>
        <TabsContent value="activity">
          <McpActivityCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
